#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-sitemap-floor.mjs — the sitemap advertises only what clears the floor
// ─────────────────────────────────────────────────────────────────────────────
// A sitemap is a promise made to a machine, and the machine keeps it: every URL
// in it is a page PolitiDex is asking to have indexed, crawled and shown to
// somebody searching for that person's name. So the interesting question is not
// "did we list enough" — it is "is every single thing we listed worth arriving
// at".
//
// The roster holds 757 people. 148 of them have no cited position at all, and a
// further batch rest on exactly one. The product already has a word for that
// last group — word-action.js prints "this row rests on one item" and marks it
// pdxwa-row-thin — so publishing an address for a one-item record would be
// lowering our own floor in order to fill a file. A search result promising
// "Jane Doe's promises, votes and money, each one sourced" that opens on "this
// record is still being built" is worse than no search result: it spends the
// reader's trust to gain a crawl.
//
// What must stay true:
//
//   1. ONE FLOOR, TWO RUNTIMES. publication-floor.js is a browser module AND the
//      module the Node generator loads. Not a reimplementation — the same file,
//      so the sitemap and the app cannot disagree about who is publishable.
//   2. THE FLOOR IS NOT DECORATIVE. It actually rejects records: the publishable
//      set is a strict subset of the roster, and every rejection names a reason.
//   3. THE SITEMAP MATCHES THE FLOOR EXACTLY. Every /p/ entry clears it; every
//      roster member that clears it is present. No extras, no omissions.
//   4. EVERY ADDRESS IS WELL-FORMED. One origin, the locked apex, no duplicates,
//      and every pid inside the charset the URL scheme was designed around.
//   5. THE GENERATOR IS DETERMINISTIC AND CHECKED-IN. `--check` passes, which
//      means the committed sitemap.xml is the one this data produces.
//   6. NOTHING IS DISALLOWED THAT SHOULD ONLY BE UNADVERTISED. robots.txt points
//      at the sitemap and does not Disallow the person files below the floor —
//      not listing a record is "we are not promoting this yet"; disallowing it
//      is "this should not be read", which is a different and wronger claim.
//
//   node scripts/test-sitemap-floor.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ sitemap floor: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";

// ─────────────────────────────────────────────────────────────────────────────
// 1 · One floor, loaded the way the generator loads it
// ─────────────────────────────────────────────────────────────────────────────
section("1 · one floor, shared by the app and the generator");

const FLOOR_SRC = R("publication-floor.js");
const GEN_SRC = R("scripts/gen-sitemap.mjs");

// The generator must LOAD the client module, not carry its own copy of the rule.
has(GEN_SRC, "publication-floor.js", "the generator no longer loads the shared floor module");
ok(!/MIN_CITED_POSITIONS\s*=/.test(GEN_SRC),
   "the generator declares its own threshold — that is a second floor waiting to drift from the first");
has(FLOOR_SRC, "PDXPublicationFloor", "publication-floor.js no longer exports PDXPublicationFloor");

// Load the data + the floor in one context, exactly as gen-sitemap.mjs does.
const ctx = vm.createContext({ console, window: {} });
ctx.window = ctx;
ctx.globalThis = ctx;
for (const f of ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "publication-floor.js"]) {
  new vm.Script(R(f), { filename: f }).runInContext(ctx);
}
const FLOOR = ctx.window.PDXPublicationFloor;
must(FLOOR && typeof FLOOR.publishable === "function", "PDXPublicationFloor did not register in a vm context");

const roster = ctx.window.CMP_DATA || {};
const rosterIds = Object.keys(roster);
must(rosterIds.length > 400, `the roster loaded in the vm context (${rosterIds.length})`);

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The floor rejects, and says why
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the floor rejects real records, with a reason each time");

const publishable = FLOOR.publishable();
ok(publishable.length > 0, "the floor publishes nothing at all — that is a broken rule, not a strict one");
ok(publishable.length < rosterIds.length,
   `the floor admits the whole roster (${publishable.length}/${rosterIds.length}) — a floor that rejects nothing is decoration`);

const rejected = rosterIds.filter((pid) => !FLOOR.clears(pid));
ok(rejected.length > 0, "no roster record fails the floor — see above");
for (const pid of rejected) {
  const r = FLOOR.read(pid);
  ok(r && !r.publishable && r.reasons && r.reasons.length > 0,
     `${pid} was rejected without a stated reason — an unexplained rejection cannot be audited or fixed`);
  if (failures.length > 6) break; // one example is enough to act on
}

// The threshold is the product's own word for thin, not a number picked to hit a
// count: a record resting on a single cited position does not clear on its own.
eq(FLOOR.MIN_CITED_POSITIONS, 2, "the cited-position threshold moved — that is a floor change, not a refactor");
has(R("word-action.js"), "rests on one item",
    "the product no longer calls a one-item record thin, so the threshold above lost its justification");

// Identity is required, not inferred: no name, no office, no state, no address.
const noIdentity = FLOOR.read("__definitely_not_a_person__");
ok(noIdentity && !noIdentity.publishable && noIdentity.reasons.includes("no-identity"),
   "an id the roster does not carry is treated as publishable — a sitemap entry for nobody");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The sitemap is exactly the floor's answer
// ─────────────────────────────────────────────────────────────────────────────
section("3 · every entry clears the floor, and every clearing record is present");

const XML = R("sitemap.xml");
const locs = [...XML.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
must(locs.length > 100, `the sitemap parsed (${locs.length} entries)`);

eq(new Set(locs).size, locs.length, "the sitemap lists the same URL twice");
for (const u of locs) {
  if (!u.startsWith(ORIGIN + "/")) { ok(false, `${u} is not on the locked apex origin`); break; }
}
ok(locs.every((u) => u.startsWith(ORIGIN + "/")), "every sitemap URL is on the one public origin");
ok(!/politidex\.org/.test(XML), "the sitemap still names the retired .org host");

const people = locs.filter((u) => u.startsWith(ORIGIN + "/p/")).map((u) => u.slice((ORIGIN + "/p/").length));
must(people.length > 100, `the sitemap carries person files (${people.length})`);

const floorSet = new Set(publishable);
const extras = people.filter((pid) => !floorSet.has(pid));
const missing = publishable.filter((pid) => people.indexOf(pid) === -1);
eq(extras.length, 0,
   `the sitemap advertises ${extras.length} person file(s) that fail the publication floor (e.g. ${extras.slice(0, 3).join(", ")})`);
eq(missing.length, 0,
   `${missing.length} publishable person file(s) are missing from the sitemap (e.g. ${missing.slice(0, 3).join(", ")})`);

// Spot-check the promise from the other end: pick the thinnest rejected record
// and confirm its address is nowhere in the file.
const thinnest = rejected.slice().sort((a, b) => FLOOR.read(a).cited - FLOOR.read(b).cited)[0];
if (thinnest) ok(!XML.includes("/p/" + thinnest), `${thinnest} fails the floor and is still advertised`);

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Every address is one the scheme can carry
// ─────────────────────────────────────────────────────────────────────────────
section("4 · well-formed addresses only");

for (const pid of people) {
  if (FLOOR.PID_RE.test(pid)) continue;
  ok(false, `/p/${pid} is outside the pid charset the URL scheme was built for (${FLOOR.PID_RE})`);
  break;
}
ok(people.every((pid) => FLOOR.PID_RE.test(pid)), "every published pid matches PDXPublicationFloor.PID_RE");
ok(people.every((pid) => pid === encodeURIComponent(pid)),
   "a published pid needs percent-encoding — the address scheme was chosen so it would not");
// The home page is the one non-record entry we claim.
has(XML, `<loc>${ORIGIN}/</loc>`, "the sitemap does not list the site root");
// Issue records ride along where they already have addresses; roll calls do not,
// because that set lives behind an API and cannot be enumerated at build time.
ok(locs.some((u) => u.startsWith(ORIGIN + "/issue/")), "no Issue Spotlight is advertised");
ok(!locs.some((u) => u.startsWith(ORIGIN + "/vote/")),
   "the sitemap advertises roll-call pages — that set is not enumerable at build time, so any list of it is a guess");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The committed file is the generated file
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the checked-in sitemap is what this data produces");

let checkOk = true;
let checkOut = "";
try {
  checkOut = execFileSync(process.execPath, [join(ROOT, "scripts/gen-sitemap.mjs"), "--check"],
    { cwd: ROOT, encoding: "utf8" });
} catch (e) {
  checkOk = false;
  checkOut = String((e && (e.stdout || e.message)) || "");
}
ok(checkOk, `gen-sitemap --check failed — the committed sitemap.xml/robots.txt are stale: ${checkOut.trim().slice(0, 300)}`);

// The origin is pinned in the generator rather than read from the environment: a
// sitemap that changes hostname with the build can ship a preview URL to a
// search engine.
has(GEN_SRC, `"${ORIGIN}"`, "the generator no longer hardcodes the locked origin");
ok(!/process\.env/.test(GEN_SRC),
   "the generator reads the environment — an env-derived origin is how a deploy-preview URL gets indexed");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · robots.txt: unadvertised is not forbidden
// ─────────────────────────────────────────────────────────────────────────────
section("6 · robots points at the sitemap and forbids nothing it merely omits");

const ROBOTS = R("robots.txt");
has(ROBOTS, `Sitemap: ${ORIGIN}/sitemap.xml`, "robots.txt does not point at the sitemap");
has(ROBOTS, "Allow: /", "robots.txt does not allow the site");
ok(!/^Disallow:\s*\/p\//m.test(ROBOTS),
   "robots.txt disallows the person files — below the floor means unadvertised, not unreadable");
ok(/^Disallow:\s*\/api\//m.test(ROBOTS), "robots.txt does not keep crawlers out of /api/");

console.log("");
if (failures.length) {
  console.error(`✗ sitemap floor: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ sitemap floor: one floor, ${publishable.length} publishable of ${rosterIds.length}, and the sitemap says exactly that — ${passed} assertions passed\n`);
