#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-one-truth-surfaces.mjs — a crawler, a share card and a reader see the same
// stances and the same bills
// ─────────────────────────────────────────────────────────────────────────────
// Generator cleanup, phase 3. Pins:
//   1. THE FLOOR COUNTS PIPELINE POSITIONS (publication-floor.js) — as stated
//      positions, on the page's own terms: one per issue key the curated list
//      does not carry, sourced only. Same door, same number.
//   2. THE SITEMAP: the generator reads every stance chunk the page loads, writes
//      db/sitemap-floor-pending.json from the floor's own pipelineNeed(), and the
//      /sitemap.xml edge adds /p/<pid> for each pending file the live pipeline
//      keys carry over — after the last /p/ line, nothing else moved.
//   3. SHARE + CRAWL: the person share description, card footnote and crawl
//      block print the page's own position count, curated + pipeline.
//   4. GENERATED BILLS: the bill-pages index (refreshed by etag from the store)
//      adds generated /b/ pages to site search (bill-search-index.js) and to the
//      sponsored-bills list (person-bills.json) of a person tied to the bill.
//   5. WALLS: the stance engine, Evidence Locker, activity badge and Phase 2's
//      recorded-votes sections are byte-identical to HEAD; the service worker
//      moved because a precached script did.
//
//   node scripts/test-one-truth-surfaces.mjs   (no network)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { STANCE_FILES } from "./stance-bundle-files.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

// The network is a fixture. Only the pipeline keys read is answered.
let PIPE = { keys: {}, count: 0 };
let pipeReads = 0, otherFetches = 0;
globalThis.fetch = async (u) => {
  const s = String(u && u.url ? u.url : u);
  if (/\/api\/stated-positions\?view=keys$/.test(s)) {
    pipeReads++;
    return new Response(JSON.stringify(PIPE), { status: 200, headers: { "content-type": "application/json" } });
  }
  otherFetches++;
  throw new Error("offline");
};

const dir = mkdtempSync(join(tmpdir(), "one-truth-"));
const blobsStub = {
  name: "blobs-stub",
  setup(b) {
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: "blobs", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: `export function getStore(name) { return globalThis.__getStore(name); }`, loader: "js",
    }));
  },
};
let n = 0;
const build = async (entry, plugins = []) => {
  const out = join(dir, `m${n++}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
};

// ── 1 · the floor ────────────────────────────────────────────────────────────
section("1 · the floor counts pipeline positions as stated positions");
const fctx = vm.createContext({ console, window: {} });
fctx.window = fctx; fctx.globalThis = fctx;
new vm.Script(read("publication-floor.js"), { filename: "publication-floor.js" }).runInContext(fctx);
const F = fctx.window.PDXPublicationFloor;
ok(F && typeof F.pipelineNeed === "function" && typeof F.contentClears === "function", "the floor exports pipelineNeed and contentClears");
eq(F.MIN_CITED_POSITIONS, 2, "the threshold did not move");
const roster = {
  one_cited: { name: "One Cited", office: "State Senator", state: "Utah" },
  none: { name: "No Record", office: "State Senator", state: "Utah" },
  promised: { name: "Has Promise", office: "Mayor", state: "Utah", pending: 3 },
  nobody: { name: "", office: "", state: "" },
};
const stances = {
  one_cited: [{ issueKey: "water", topic: "Water", source: { url: "https://a.example/1" } }],
};
const card = (k, url = "https://b.example/" + k) => ({ issueKey: k, provenance: "pipeline", issueStance: "support", source: { url } });
const src = (pipeline) => ({ roster, stances, formal: null, aliases: {}, pipeline });
ok(!F.clears("one_cited", src(null)), "fixture premise: one cited position alone does not clear");
ok(F.clears("one_cited", src({ one_cited: [card("housing")] })), "one cited + one pipeline position on a new key clears");
ok(!F.clears("one_cited", src({ one_cited: [card("water")] })), "a pipeline card on a key the curated list carries does not count (curated wins)");
ok(!F.clears("one_cited", src({ one_cited: [card("housing", "")] })), "a pipeline card with no followable source does not count");
ok(!F.clears("one_cited", src({ one_cited: [card("housing"), card("housing")] })) || F.read("one_cited", src({ one_cited: [card("housing"), card("housing")] })).pipeline === 1,
   "two pipeline cards on one key count once");
ok(F.clears("none", src({ none: [card("a"), card("b")] })), "two pipeline positions clear a file with nothing curated");
ok(!F.clears("none", src({ none: [card("a")] })), "one pipeline position alone is thin, as one curated one is");
ok(F.clears("promised", src({ promised: [card("a")] })), "one pipeline position + a tracked promise clears, as a curated one does");
ok(F.clears("none", src({ cards: (pid) => (pid === "none" ? [card("a"), card("b")] : []) })), "the browser shape (PDXPipelineStances.cards) is read too");
eq(F.read("none", src({ none: [card("a"), card("b")] })).pipeline, 2, "read() reports the pipeline count");
eq(F.read("none", src(null)).reasons, ["no-cited-record"], "with nothing at all the reason is still no-cited-record");
eq([F.pipelineNeed("one_cited", src(null)), F.pipelineNeed("none", src(null)), F.pipelineNeed("promised", src(null)), F.pipelineNeed("nobody", src(null))],
   [1, 2, 1, null], "pipelineNeed: 1, 2, 1 and null (no identity — no number of positions gives an address to nobody)");
eq(F.pipelineNeed("one_cited", src({ one_cited: [card("housing")] })), 0, "pipelineNeed is 0 once a file clears");

// ── 2 · the sitemap ──────────────────────────────────────────────────────────
section("2 · the sitemap reads every stance chunk, and the edge adds pipeline-cleared files");
const gen = read("scripts/gen-sitemap.mjs");
ok(/\.\.\.STANCE_FILES/.test(gen) && /stance-bundle-files\.mjs/.test(gen), "gen-sitemap.mjs loads the shared stance list");
const pageLoads = new Set([...read("person.html").matchAll(/<script[^>]+src="\/?((?:politician|state-senate)-stances[^"]*\.js)"/g)].map((m) => m[1]));
eq(STANCE_FILES.filter((f) => !pageLoads.has(f)), [], "every stance chunk the generators read is one person.html loads");
eq([...pageLoads].filter((f) => !STANCE_FILES.includes(f)).sort(), [], "…and every chunk person.html loads is read by the generators");
let checkOut = "";
try { checkOut = execFileSync("node", [join(ROOT, "scripts/gen-sitemap.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" }); }
catch (e) { checkOut = String(e.stdout || "") + String(e.stderr || ""); }
ok(/are current/.test(checkOut), `sitemap.xml, robots.txt and the pending table are current (${checkOut.trim().split("\n").pop()})`);

const sctx = vm.createContext({ console, window: {} });
sctx.window = sctx; sctx.globalThis = sctx;
for (const f of ["cmp-data.js", ...STANCE_FILES, "formal-index.js", "publication-floor.js"]) new vm.Script(read(f), { filename: f }).runInContext(sctx);
const SF = sctx.window.PDXPublicationFloor;
const PENDING = JSON.parse(read("db/sitemap-floor-pending.json")).pending;
const pendingIds = Object.keys(PENDING);
ok(pendingIds.length > 0, `the pending table holds the files pipeline positions could publish (${pendingIds.length})`);
let rowsOk = true;
for (const pid of pendingIds.slice(0, 400)) {
  if (SF.pipelineNeed(pid) !== PENDING[pid].n || SF.clears(pid)) { rowsOk = false; failures.push(`pending row ${pid} disagrees with the floor`); break; }
}
ok(rowsOk, "each pending row's n is the floor's own pipelineNeed, and none already clears");
const XML = read("sitemap.xml");
ok(pendingIds.every((pid) => !XML.includes(`/p/${pid}<`)), "no pending file is in the committed sitemap");

const one = pendingIds.find((p) => PENDING[p].n === 1 && PENDING[p].k && PENDING[p].k.length);
const two = pendingIds.find((p) => PENDING[p].n === 2 && !PENDING[p].k);
ok(one && two, "fixture premise: a pending file needing one position and one needing two");
// The floor agrees with the fixture: the same keys clear the same files.
ok(SF.clears(one, { pipeline: { [one]: [card("zz_new_key")] } }), `${one} clears with one pipeline position on a new key`);
ok(!SF.clears(one, { pipeline: { [one]: [card(PENDING[one].k[0])] } }), `${one} does not clear on a key its curated list carries`);

let storeMode = "ok";
const blobStore = { pages: {} };
globalThis.__getStore = () => ({
  async list() { if (storeMode !== "ok") throw new Error("down"); return { blobs: [] }; },
  async get(k) { if (storeMode !== "ok") throw new Error("down"); return blobStore.pages[k] ?? null; },
});
const SITEMAP_EDGE = await build("netlify/edge-functions/sitemap-bill-pages.ts", [blobsStub]);
const servedSitemap = async () => {
  const ctx = { next: async () => new Response(XML, { status: 200, headers: { "content-type": "application/xml" } }) };
  return (await SITEMAP_EDGE.default(new Request("https://politidex.fyi/sitemap.xml"), ctx)).text();
};
const locs = (x) => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
PIPE = { keys: { [one]: ["zz_new_key"], [two]: ["zz_a", "zz_b"], [pendingIds.find((p) => p !== one && p !== two && PENDING[p].n === 2)]: ["only_one"] }, count: 4 };
const PL = await build("netlify/lib/pipeline-positions.ts");
let body = await servedSitemap();
const added = locs(body).filter((u) => !locs(XML).includes(u));
eq(added.sort(), [`https://politidex.fyi/p/${one}`, `https://politidex.fyi/p/${two}`].sort(), "the edge adds exactly the files the live keys carry over");
const pLocs = locs(body).map((u, i) => [u, i]).filter(([u]) => u.includes("/p/")).map(([, i]) => i);
ok(pLocs.every((v, i) => i === 0 || v === pLocs[i - 1] + 1), "the person block stays one contiguous block");
eq(locs(body).filter((u) => !added.includes(u)), locs(XML), "every committed line is still there, in order");
ok(body.includes(`  <url><loc>https://politidex.fyi/p/${one}</loc></url>\n`), "in the generator's own line format");
// Curated wins at the edge, too.
const SP = await build("netlify/lib/sitemap-person-pipeline.ts");
eq(SP.pipelinePublishable({ [one]: PENDING[one] }, { [one]: [PENDING[one].k[0]] }), [], "a pipeline key the curated list carries does not count at the edge");
eq(SP.pipelinePublishable({ x: { n: 1, a: ["x_alt"] } }, { x_alt: ["k"] }), ["x"], "a card filed under an alternate id counts, as _pipelineFor reads it");

// ── 3 · share + crawl ────────────────────────────────────────────────────────
section("3 · the share preview and the crawl block print the page's own count");
const ST = await build("netlify/lib/share-target.ts");
const POS = JSON.parse(read("db/share-stances.json")).positions;
ok(POS && POS.lee && POS.lee.n > 0, "the curated half of lee's count is baked");
// The curated half is the page's own list length (_resolveStanceList), resolved
// the way the page resolves it.
const hctx = vm.createContext({ console, window: {} }); hctx.window = hctx;
for (const f of ["cmp-data.js", ...STANCE_FILES]) new vm.Script(read(f), { filename: f }).runInContext(hctx);
eq(POS.lee.n, (hctx.window.ISSUE_STANCE_DATA.lee || hctx.window.ISSUE_STANCE_DATA.mike_lee || []).length, "n is the length of the list the page renders");
eq(ST.positionsOnFile("lee", "Mike Lee", null), POS.lee.n, "with no live keys, the count is the curated half alone");
eq(ST.positionsOnFile("lee", "Mike Lee", { lee: [POS.lee.k[0], "zz_new"] }), POS.lee.n + 1, "a pipeline key the curated list lacks adds one; one it carries adds none");
eq(ST.positionsPhrase(1), "1 documented position on file", "singular");
eq(ST.positionsPhrase(0), "", "nothing printed for none");
PL.resetPipelineKeys && PL.resetPipelineKeys();
PIPE = { keys: { lee: ["zz_new_one", "zz_new_two"] }, count: 2 };
const r = await ST.resolveTarget(ST.parseTarget(new URL("https://politidex.fyi/p/lee")), "https://politidex.fyi");
const want = POS.lee.n + 2;
ok(r && r.description.includes(`${want} documented positions on file.`), `the share description carries ${want} (${r && r.description})`);
ok(r && r.footnote.startsWith(`${want} documented positions on file`), "…and so does the card footnote");
eq(r && r.person && r.person.positions, want, "the crawl block is handed the same number");
ok(read("netlify/edge-functions/share-preview.ts").includes("data-pdx-crawl-positions"), "the crawl block prints it");

// ── 4 · generated bills ──────────────────────────────────────────────────────
section("4 · generated bill pages reach site search and the person bill lists");
const BI = await build("netlify/lib/bill-pages-index.ts");
const P = await build("netlify/lib/vote-actions-pages.ts");
const { groupOf } = await import(pathToFileURL(join(ROOT, "scripts/bill-record-core.mjs")).href);
const PB = JSON.parse(read("person-bills.json"));
const sponsor = Object.keys(PB.people)[0];
const rec = (c, num, extra = {}) => ({ v: P.PAGE_VERSION, url: P.billPageUrl(c, num), doc: { s: String(c), n: num, c: "house", t: `Generated ${num}`, m: [{ k: "healthcare" }], st: "introduced", sl: "Introduced", sp: { s: [sponsor] }, ...extra } });
const mem = {
  blobs: {
    [P.pageStoreKey(119, "H.R. 9901")]: { etag: "e1", v: rec(119, "H.R. 9901") },
    [P.pageStoreKey(119, "H.R. 9902")]: { etag: "e2", v: rec(119, "H.R. 9902", { sp: undefined }) },
    [P.pageStoreKey(119, "H.R. 1")]: { etag: "e3", v: rec(119, "H.R. 1") }, // a snapshot bill: left as it is
  },
  saved: null,
};
const store = {
  async list({ prefix }) { return { blobs: Object.keys(mem.blobs).filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: mem.blobs[key].etag })) }; },
  async get(k) { if (k === BI.BILL_PAGES_INDEX_KEY) return mem.saved; return mem.blobs[k] ? mem.blobs[k].v : null; },
  async setJSON(k, v) { if (k === BI.BILL_PAGES_INDEX_KEY) mem.saved = JSON.parse(JSON.stringify(v)); },
};
let rr = await BI.refreshBillPagesIndex(store, { groupOf });
eq([rr.read, rr.total, rr.saved], [3, 3, true], "the index reads every page once and saves");
rr = await BI.refreshBillPagesIndex(store, { groupOf });
eq([rr.read, rr.saved], [0, false], "an unchanged store costs no reads and no write");
mem.blobs[P.pageStoreKey(119, "H.R. 9901")] = { etag: "e1b", v: rec(119, "H.R. 9901", { st: "enacted", sl: "Enacted — signed into law" }) };
delete mem.blobs[P.pageStoreKey(119, "H.R. 9902")];
rr = await BI.refreshBillPagesIndex(store, { groupOf });
eq([rr.read, rr.dropped, rr.total], [1, 1, 2], "a rewritten page is re-read by etag, a removed one dropped");
eq(mem.saved.pages[P.pageStoreKey(119, "H.R. 9901")].g, "enacted", "the group is the snapshot's own groupOf");
ok(!Object.keys(mem.saved.pages).some((k) => !k.startsWith("us/")) && BI.BILL_PAGES_INDEX_KEY.indexOf("us/") !== 0,
   "the index key sits outside the us/ prefix the sitemap and client lists read");

const SEARCH = read("bill-search-index.js");
const ms = BI.mergeSearchIndex(SEARCH, mem.saved);
eq(ms.added, 1, "site search gains the one generated page it lacks (H.R. 1 is already a row)");
const ectx = vm.createContext({ window: {} }); ectx.window = ectx;
new vm.Script(ms.js).runInContext(ectx);
const rows = ectx.window.PDX_BILL_SEARCH;
const before = (() => { const c = vm.createContext({ window: {} }); c.window = c; new vm.Script(SEARCH).runInContext(c); return c.window.PDX_BILL_SEARCH; })();
eq(rows.length, before.length + 1, "the merged script still evaluates to one array, one row longer");
eq(rows.at(-1), ["119", "H.R. 9901", "Generated H.R. 9901", "enacted", "house", ["healthcare"]], "in the file's own row shape");
eq(rows.slice(0, before.length), before, "every committed row is unchanged");

const mp = BI.mergePersonBills(PB, mem.saved);
eq(mp.added, 1, "the sponsor table gains the generated bill");
const idx = mp.data.bills.findIndex((b) => b[1] === "H.R. 9901");
ok(idx >= PB.bills.length && mp.data.people[sponsor].some((x) => x[0] === idx && x[1] === "s"), `${sponsor} carries it as sponsor`);
eq(mp.data.bills[idx], ["119", "H.R. 9901", "Generated H.R. 9901", "enacted", "enacted", "Enacted — signed into law", ["healthcare"]], "in the file's own row shape");
eq(mp.data.bills.slice(0, PB.bills.length), PB.bills, "every committed row is unchanged");
// The person file's own reader lists it.
const bctx = vm.createContext({ window: {}, document: { readyState: "complete", addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } }, console });
bctx.window = bctx;
new vm.Script(read("person-bills.js")).runInContext(bctx);
const listed = bctx.window.PDXPersonBills.rowsFor(mp.data, sponsor);
ok(listed.some((x) => x.n === "H.R. 9901" && x.r === "s" && x.g === "enacted"), "PDXPersonBills.rowsFor lists it on the sponsor's file");

// The edges, bundled, serving the committed files.
let idxMode = "ok";
globalThis.__getStore = () => ({ async get(k) { if (idxMode !== "ok") throw new Error("down"); return k === BI.BILL_PAGES_INDEX_KEY ? mem.saved : null; } });
const SE = await build("netlify/edge-functions/bill-search-index-client.ts", [blobsStub]);
const PE = await build("netlify/edge-functions/person-bills-client.ts", [blobsStub]);
const via = async (E, path, file, type) => (await E.default(new Request("https://politidex.fyi" + path), { next: async () => new Response(file, { status: 200, headers: { "content-type": type } }) })).text();
eq(await via(SE, "/bill-search-index.js", SEARCH, "application/javascript"), ms.js, "the search edge serves the merged script");
eq(JSON.parse(await via(PE, "/person-bills.json", read("person-bills.json"), "application/json")), mp.data, "the person-bills edge serves the merged table");
idxMode = "down";
eq(await via(SE, "/bill-search-index.js", SEARCH, "application/javascript"), SEARCH, "index unavailable → committed search list, untouched");
eq(await via(PE, "/person-bills.json", read("person-bills.json"), "application/json"), read("person-bills.json"), "index unavailable → committed table, untouched");
eq([SE.config.path, PE.config.path], ["/bill-search-index.js", "/person-bills.json"], "no new route: each edge declares an existing file's address");
ok(/refreshBillPagesIndex/.test(read("netlify/functions/vote-actions-cron.mts")), "the bill job refreshes the index after its run");
// Recorded votes already link every bill with a citation to its /b/ address.
ok(/const page = number && b\.congress && b\.measureType !== "nomination"/.test(read("netlify/lib/vote-actions-publish.ts")),
   "the recorded-votes read links each bill to /b/<congress>/<number>, generated or not");

// ── 5 · walls ────────────────────────────────────────────────────────────────
section("5 · walls");
const untouched = ["person-recorded-votes.js", "bill-roll-calls.js", "stance-helpers.js", "consistency.js", "word-action.js",
  "netlify/lib/stance-score-core.mjs", "netlify/lib/stance-check.mjs", "profile-locker.js", "evidence-locker.js",
  "netlify/lib/evidence-locker-core.mjs", "profiles-full.js", "person-bills.js", "all-seeing-eye.js"];
let headOk = true, compared = 0;
for (const f of untouched) {
  let head;
  try { head = execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }); } catch { continue; }
  compared++;
  if (head !== read(f)) { headOk = false; failures.push(`${f} moved — this pass does not touch it`); }
}
if (compared) ok(headOk, `the stance engine, Evidence Locker, activity badge and recorded-votes files are byte-identical to HEAD (${compared})`);
const SW = read("sw.js");
ok(/const CACHE_VERSION = 'v585';/.test(SW), "the service worker moved (a precached script — publication-floor.js — changed)");
ok(!/'\/bill-search-index\.js'|'\/person-bills\.json'/.test(SW), "the two merged files are not precached (runtime cache only), so the worker code did not move");
eq(otherFetches, 0, "no network call other than the pipeline keys fixture");

if (failures.length) {
  console.error(`\n✗ one truth across surfaces: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ one truth across surfaces: ${passed} checks passed`);
