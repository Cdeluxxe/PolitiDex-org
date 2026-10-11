#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-cap-line.mjs — the five composer boards state the cap
// ─────────────────────────────────────────────────────────────────────────────
// Under the composer heading, in every state, the five composer boards print
// one sentence: what a verified resident gets on the seat and what the $20
// yearly membership changes. It is the cap membership-core.mjs enforces and
// /me states (one comment and five poll votes a month). The locked line stays
// verbatim beside it.
//
// WHAT THIS SUITE PROVES:
//   1. Each of the five board documents serves the sentence exactly once, in
//      the composer host, and the locked line is unchanged.
//   2. district-composer.js paints the sentence locked AND open, and the locked
//      line only when locked.
//   3. The sentence appears in no other shipped document or script.
//   4. The sentence agrees with the server's cap and with /me's figures.
//   5. No stock, share, earn, profit, equity or Form C language.
//   6. MUTATION: a board without the sentence, or a sentence on a sixth file,
//      fails the checks.
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { CAP_COPY } from "../netlify/lib/membership-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ board cap line: STALE HARNESS — ${m}`); process.exit(1); } };
const flush = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const CAP = "Verified residents get one comment and five poll votes a month on this seat. " +
  "A $20 yearly membership removes the monthly cap.";
const LOCKED = "Only verified residents of this seat get a voice that counts.";
const BOARDS = ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-hd-15", "ut-cd-2"];
const BANNED = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bearn(?:s|ed|ing|ings)?\b|\bprofits?\b|\bform\s*c\b|\bequity\b|\binvest/i;

const COMPOSER = R("district-composer.js");
const SERVED = `<p class="pdxdb-foot" data-pdxdc-cap="1">${CAP}</p>`;

function boardFails(html, alias) {
  const out = [];
  const live = String(html).replace(/<!--[\s\S]*?-->/g, "");
  const n = live.split(CAP).length - 1;
  if (n !== 1) out.push(`${alias}: the cap sentence is served ${n} times`);
  const host = live.indexOf(`id="pdx-district-composer" data-pdxdc-seat="${alias}"`);
  const at = live.indexOf(SERVED);
  if (host < 0 || at < host) out.push(`${alias}: the cap sentence is not inside the composer host`);
  if (live.indexOf(`data-pdxdc-locked="1">${LOCKED}</p>`) < 0) out.push(`${alias}: the locked line is not served verbatim`);
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the five board documents serve the sentence and the locked line");
// ═════════════════════════════════════════════════════════════════════════════
for (const a of BOARDS) eq(boardFails(R(`district-${a}.html`), a).join(" | "), "", `${a}: served copy`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the composer paints it locked and open");
// ═════════════════════════════════════════════════════════════════════════════
eq((COMPOSER.match(/var LOCKED_LINE = '([^']+)';/) || [])[1], LOCKED, "district-composer.js: the locked line");

async function paint(alias, answer) {
  const host = {
    innerHTML: "", attrs: { "data-pdxdc-seat": alias },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector() { return null; },
  };
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URL,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
    setTimeout() { return 0; }, clearTimeout() {},
    location: { pathname: `/district/${alias}`, search: "", hash: "", origin: "https://politidex.fyi", assign() {} },
    document: { readyState: "complete", addEventListener() {}, getElementById: (id) => (id === "pdx-district-composer" ? host : null) },
    auth: { currentUser: null, onAuthStateChanged() {} },
    async fetch() { return { ok: !!answer, status: answer ? 200 : 500, json: async () => answer || {} }; },
  };
  win.window = win;
  vm.runInContext(COMPOSER, vm.createContext(win), { filename: "district-composer.js" });
  await flush();
  return { html: host.innerHTML, state: host.attrs["data-pdxdc-state"], M: win.PDXDistrictComposer };
}
for (const a of BOARDS) {
  const locked = await paint(a, { voice: { canPost: false, reason: "signed_out" }, posts: [] });
  eq(locked.state, "locked", `${a}: signed out paints locked`);
  ok(locked.html.indexOf(`data-pdxdc-locked="1">${LOCKED}</p>`) >= 0, `${a} locked: the locked line is painted`);
  eq(locked.html.split(CAP).length - 1, 1, `${a} locked: the cap sentence is painted once`);
  ok(locked.html.indexOf(LOCKED) < locked.html.indexOf(CAP), `${a} locked: the cap sentence follows the locked line`);
  eq(locked.M.CAP_LINE, CAP, `${a}: PDXDistrictComposer.CAP_LINE`);

  const failed = await paint(a, null);
  eq(failed.html.split(CAP).length - 1, 1, `${a} failed read: the cap sentence is painted once`);

  const open = await paint(a, { voice: { canPost: true }, posts: [] });
  eq(open.state, "open", `${a}: a verified answer paints open`);
  ok(open.html.indexOf(LOCKED) < 0, `${a} open: no locked line`);
  eq(open.html.split(CAP).length - 1, 1, `${a} open: the cap sentence is painted once`);
}
{
  const other = await paint("ut-sd-6", { voice: { canPost: false }, posts: [] });
  eq(other.html, "", "a non-composer seat mounts nothing, so no cap sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · nowhere else");
// ═════════════════════════════════════════════════════════════════════════════
const ALLOWED = new Set(["district-composer.js", ...BOARDS.map((a) => `district-${a}.html`)]);
function strays(read) {
  const out = [];
  const roots = readdirSync(ROOT).filter((f) => /\.(html|js|mjs)$/.test(f)).map((f) => f);
  const fns = ["netlify/functions", "netlify/lib", "netlify/edge-functions"].flatMap((d) => {
    try { return readdirSync(join(ROOT, d)).filter((f) => /\.(js|mjs|ts)$/.test(f)).map((f) => `${d}/${f}`); } catch { return []; }
  });
  for (const f of [...roots, ...fns]) {
    if (ALLOWED.has(f)) continue;
    const s = read(f);
    if (s.indexOf(CAP) >= 0 || /removes the monthly cap/.test(s)) out.push(f);
  }
  return out;
}
eq(strays(R).join(", "), "", "no other shipped file carries the cap sentence");
{
  // A sentence written onto /me or a generated board is caught.
  ok(strays((f) => (f === "me.html" ? R(f) + CAP : R(f))).length === 1, "mutation: the cap sentence on /me passed");
  ok(strays((f) => (f === "district-ut-sd-6.html" ? R(f) + CAP : R(f))).length === 1, "mutation: the cap sentence on ut-sd-6 passed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the sentence agrees with the server and /me");
// ═════════════════════════════════════════════════════════════════════════════
ok(/one comment a month/.test(CAP_COPY.comment), "the server cap is still one comment a month");
ok(/five poll votes a month/.test(CAP_COPY.vote), "the server cap is still five poll votes a month");
ok(/one comment and five poll votes a month on that seat\. \$20 a year removes the cap\./.test(R("me.html")),
  "/me still states the same figures");
ok(!/\ba day\b|\bdaily\b/i.test(CAP), "the sentence names no daily cap");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · clean copy");
// ═════════════════════════════════════════════════════════════════════════════
ok(!BANNED.test(CAP), `the cap sentence carries a banned word — ${CAP}`);
ok(CAP.indexOf(LOCKED) < 0, "the cap sentence is not a second copy of the locked line");
for (const w of ["stock", "shares", "earn", "profit", "Form C", "equity"]) {
  ok(BANNED.test(`A sentence with ${w} in it.`), `the banned sweep misses "${w}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mutation: a board without the sentence fails");
// ═════════════════════════════════════════════════════════════════════════════
for (const a of BOARDS) {
  const html = R(`district-${a}.html`);
  const cut = html.replace(SERVED, "");
  must(cut !== html, `${a}: the served sentence could not be found to delete`);
  ok(boardFails(cut, a).length > 0, `mutation: ${a} without the cap sentence passed`);
  const reworded = html.replace(`>${LOCKED}</p>`, `>Only verified residents get a voice.</p>`);
  ok(boardFails(reworded, a).length > 0, `mutation: ${a} with a reworded locked line passed`);
}

if (failures.length) {
  console.error(`\n✗ board cap line: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ board cap line: all ${passed} assertions passed`);
