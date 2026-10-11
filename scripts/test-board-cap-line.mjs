#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-cap-line.mjs — every board's composer carries the locked line ONLY
// ─────────────────────────────────────────────────────────────────────────────
// The composer area used to carry a cap sentence under its heading: one comment
// and five poll votes a month, and a $20 yearly membership that lifts the cap.
// While membership is not live, that sentence is gone. Every board's composer
// area carries the locked line — "Only verified residents of this seat get a
// voice that counts." — and no membership, price, cap or month copy.
//
// WHAT THIS SUITE PROVES:
//   1. Every board document (and the generator's template) serves the locked
//      line exactly once inside the composer host, and the host holds no
//      "$20", "membership", "cap" or "month".
//   2. district-composer.js paints the locked line exactly once locked, open and
//      on a failed read, and none of the banned words in any state — including
//      a 429 monthly-cap refusal, which is shown as a neutral line.
//   3. district-poll.js shows a 429 refusal neutrally too.
//   4. The old cap sentence appears in no shipped document or script.
//   5. No stock, share, earn, profit, equity or Form C language.
//   6. MUTATION: a host with the cap sentence put back, or without the locked
//      line, fails the checks.
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ board cap line: STALE HARNESS — ${m}`); process.exit(1); } };
const flush = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const LOCKED = "Only verified residents of this seat get a voice that counts.";
const OLD_CAP = "Verified residents get one comment and five poll votes a month on this seat. " +
  "A $20 yearly membership removes the monthly cap.";
// The words the composer area must not carry. "cap" and "month" as words, so
// "capitol" or a date's short month name are not caught by accident.
const NO_MONEY = /\$20|\bmembership\b|\bcaps?\b|\bmonths?\b|\bmonthly\b/i;
const BANNED = /\bstocks?\b|\bshares?\b|\bshareholders?\b|\bearn(?:s|ed|ing|ings)?\b|\bprofits?\b|\bform\s*c\b|\bequity\b|\binvest/i;

const DOCS = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f)).sort();
must(DOCS.length > 80, "the board documents could not be read");
const aliasOf = (s) => (/data-pdxdb-seat="([^"]+)"/.exec(s) || [, ""])[1];
const textOf = (s) => String(s).replace(/<[^>]+>/g, " ");

function hostBlock(html) {
  const live = String(html).replace(/<!--[\s\S]*?-->/g, "");
  return (live.match(/<div id="pdx-district-composer"[\s\S]*?<\/section>\s*<\/div>/) || [""])[0];
}
function hostFails(html, alias) {
  const out = [];
  const block = hostBlock(html);
  if (!block) return [`${alias}: no composer host`];
  if (!block.includes(`data-pdxdc-seat="${alias}"`)) out.push(`${alias}: the host names another seat`);
  const n = block.split(LOCKED).length - 1;
  if (n !== 1) out.push(`${alias}: the locked line is served ${n} times`);
  if (NO_MONEY.test(textOf(block))) out.push(`${alias}: membership, price, cap or month copy in the composer area`);
  if (block.includes("data-pdxdc-cap")) out.push(`${alias}: the cap paragraph is still served`);
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every board document serves the locked line only");
// ═════════════════════════════════════════════════════════════════════════════
for (const f of DOCS) {
  const html = R(f);
  eq(hostFails(html, aliasOf(html)).join(" | "), "", `${f}: served composer area`);
}
{
  const TPL = R("scripts/district-board.template.html").replace(/\{\{ALIAS\}\}/g, "ut-x-1");
  eq(hostFails(TPL, "ut-x-1").join(" | "), "", "the generator's template: served composer area");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the composer paints the locked line, and no money copy, in every state");
// ═════════════════════════════════════════════════════════════════════════════
const COMPOSER = R("district-composer.js");
eq((COMPOSER.match(/var LOCKED_LINE = '([^']+)';/) || [])[1], LOCKED, "district-composer.js: the locked line");
ok(!/CAP_LINE/.test(COMPOSER), "district-composer.js: no CAP_LINE is left");

async function paint(alias, answers) {
  const host = {
    innerHTML: "", attrs: { "data-pdxdc-seat": alias },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector() { return null; },
  };
  const queue = answers.slice();
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URL,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
    setTimeout() { return 0; }, clearTimeout() {},
    location: { pathname: `/district/${alias}`, search: "", hash: "", origin: "https://politidex.fyi", assign() {} },
    document: { readyState: "complete", addEventListener() {}, getElementById: (id) => (id === "pdx-district-composer" ? host : null) },
    auth: { currentUser: null, onAuthStateChanged() {} },
    async fetch() {
      const a = queue.length > 1 ? queue.shift() : queue[0];
      const status = a ? (a.__status || 200) : 500;
      return { ok: status < 300, status, json: async () => a || {} };
    },
  };
  win.window = win;
  vm.runInContext(COMPOSER, vm.createContext(win), { filename: "district-composer.js" });
  await flush();
  return { host, state: () => host.attrs["data-pdxdc-state"], M: win.PDXDistrictComposer };
}
const area = (html) => (String(html).match(/<section class="pdxdb-band pdxdb-band--compose"[\s\S]*?<\/section>/) || [""])[0];
for (const a of ["ut-sd-3", "ut-hd-29", "ut-gov", "ut-us-senate-lee"]) {
  const locked = await paint(a, [{ voice: { canPost: false, reason: "signed_out", line: LOCKED }, posts: [] }]);
  eq(locked.state(), "locked", `${a}: signed out paints locked`);
  eq(area(locked.host.innerHTML).split(LOCKED).length - 1, 1, `${a} locked: the locked line once`);
  ok(!NO_MONEY.test(textOf(area(locked.host.innerHTML))), `${a} locked: no money copy`);

  const failed = await paint(a, [null]);
  eq(area(failed.host.innerHTML).split(LOCKED).length - 1, 1, `${a} failed read: the locked line once`);
  ok(!NO_MONEY.test(textOf(area(failed.host.innerHTML))), `${a} failed read: no money copy`);

  const open = await paint(a, [{ voice: { canPost: true }, posts: [] }]);
  eq(open.state(), "open", `${a}: a verified answer paints open`);
  eq(area(open.host.innerHTML).split(LOCKED).length - 1, 1, `${a} open: the locked line once`);
  ok(!NO_MONEY.test(textOf(area(open.host.innerHTML))), `${a} open: no money copy`);
  ok(!open.M || !("CAP_LINE" in open.M), `${a}: PDXDistrictComposer publishes no CAP_LINE`);
}
{
  // A 429 from the server carries CAP_COPY (membership wording). The composer
  // shows its own neutral line instead.
  const notTaken = (/notTaken: '([^']+)'/.exec(COMPOSER) || [])[1] || "";
  ok(!!notTaken && !NO_MONEY.test(notTaken), "the composer's monthly-cap line is neutral");
  ok(/res\.status === 429[\s\S]{0,120}COPY\.notTaken/.test(COMPOSER), "…and a 429 shows it rather than the server's wording");
  const POLL = R("district-poll.js");
  const pollNot = (/notTaken: '([^']+)'/.exec(POLL) || [])[1] || "";
  ok(!!pollNot && !NO_MONEY.test(pollNot), "the poll's monthly-cap line is neutral");
  ok(/res\.status === 429[\s\S]{0,120}COPY\.notTaken/.test(POLL), "…and a 429 vote shows it");
}
{
  const other = await paint("ut-hd-1", [{ voice: { canPost: false }, posts: [] }]);
  eq(other.host.innerHTML, "", "a seat with no board mounts nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the old cap sentence is nowhere");
// ═════════════════════════════════════════════════════════════════════════════
function strays(read) {
  const roots = readdirSync(ROOT).filter((f) => /\.(html|js|mjs)$/.test(f));
  const more = ["netlify/functions", "netlify/lib", "netlify/edge-functions"].flatMap((d) => {
    try { return readdirSync(join(ROOT, d)).filter((f) => /\.(js|mjs|ts|mts)$/.test(f)).map((f) => `${d}/${f}`); } catch { return []; }
  }).concat(["scripts/district-board.template.html"]);
  return [...roots, ...more].filter((f) => { const s = read(f); return s.indexOf(OLD_CAP) >= 0 || /removes the monthly cap/.test(s); });
}
eq(strays(R).join(", "), "", "no shipped file carries the old cap sentence");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · clean copy");
// ═════════════════════════════════════════════════════════════════════════════
ok(!BANNED.test(LOCKED), "the locked line carries no banned word");
for (const w of ["stock", "shares", "earn", "profit", "Form C", "equity"]) {
  ok(BANNED.test(`A sentence with ${w} in it.`), `the banned sweep misses "${w}"`);
}
for (const f of DOCS) ok(!BANNED.test(textOf(hostBlock(R(f)))), `${f}: no banned word in the composer area`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutation: the sentence put back, or the locked line taken out, fails");
// ═════════════════════════════════════════════════════════════════════════════
for (const f of ["district-ut-sd-3.html", "district-ut-hd-29.html", "district-ut-gov.html"]) {
  const html = R(f);
  const alias = aliasOf(html);
  const at = `data-pdxdc-locked="1">${LOCKED}</p>`;
  must(html.includes(at), `${f}: the locked line could not be found`);
  const back = html.replace(at, `${at}\n          <p class="pdxdb-foot" data-pdxdc-cap="1">${OLD_CAP}</p>`);
  ok(hostFails(back, alias).length > 0, `mutation: ${f} with the cap sentence back passed`);
  const gone = html.replace(at, `data-pdxdc-locked="1">Posting opens soon.</p>`);
  ok(hostFails(gone, alias).length > 0, `mutation: ${f} without the locked line passed`);
  ok(strays((g) => (g === f ? back : R(g))).length === 1, `mutation: the stray sweep missed ${f}`);
}

if (failures.length) {
  console.error(`\n✗ board cap line: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ board cap line: all ${passed} assertions passed`);
