#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-pages-client-generated.mjs — generated bill pages in bill-pages.js
// ─────────────────────────────────────────────────────────────────────────────
// Bundles netlify/edge-functions/bill-pages-client.ts with @netlify/blobs
// replaced by an in-memory "bill-pages" store and serves the real committed
// bill-pages.js through it. Then boots the real person-page drawer scripts
// (as scripts/test-internal-hops.mjs does) with the served file. Pins:
//   1. a bill that exists only in the store is in window.PDX_BILL_PAGES, keyed
//      "<congress>/<number>" like the snapshot bills
//   2. a person-page issue drawer that shows that bill prints its "Bill page"
//      link at the correct /b/ URL — the page's own address
//   3. snapshot bills are all still there, unchanged, and a bill in both the
//      snapshot and the store is listed once
//   4. a store error / timeout serves the committed file untouched
//   5. no new route and no drawer change: the edge declares only
//      /bill-pages.js (an existing file), consistency.js and bill-pages.js are
//      as committed, and the service worker only fetches the list network-first
//
//   node scripts/test-bill-pages-client-generated.mjs   (no network)

import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => readFileSync(join(ROOT, p), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ STALE PROBE — ${m}`); process.exit(2); };

const dir = mkdtempSync(join(tmpdir(), "bp-client-"));
const blobsStub = {
  name: "blobs-stub",
  setup(b) {
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: "blobs", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: `export function getStore(n) { return globalThis.__getStore(n); }`, loader: "js" }));
  },
};
const build = async (entry, out, plugins = []) => {
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: join(dir, out), logLevel: "silent", plugins });
  return import(pathToFileURL(join(dir, out)).href);
};
const EDGE = await build("netlify/edge-functions/bill-pages-client.ts", "edge.mjs", [blobsStub]);
const P = await build("netlify/lib/vote-actions-pages.ts", "pages.mjs");

const FILE = R("bill-pages.js");
const listOf = (src) => { const w = { window: {} }; w.window = w; vm.runInNewContext(src, w); return w.PDX_BILL_PAGES; };
const SNAP = listOf(FILE);
const snapKeys = Object.keys(SNAP);
must(snapKeys.includes("119/H.R. 6644"), "the committed list no longer holds 119/H.R. 6644");

let storeKeys = [], storeMode = "ok", storeNames = [];
globalThis.__getStore = (name) => {
  storeNames.push(name);
  return {
    async list({ prefix }) {
      if (storeMode === "throw") throw new Error("blobs unavailable");
      if (storeMode === "hang") return new Promise(() => {});
      return { blobs: storeKeys.filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: "x" })), directories: [] };
    },
  };
};
const serve = async () => {
  const ctx = { next: async () => new Response(FILE, { status: 200, headers: { "content-type": "application/javascript", etag: '"abc"' } }) };
  const res = await EDGE.default(new Request("https://politidex.fyi/bill-pages.js"), ctx);
  return { res, body: await res.text() };
};

// ── the drawer, as person.html loads it ──────────────────────────────────────
const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100, "the record corpus did not load");
const DRAWER = ["share-links.js", "pdx-issue-family.js", ...ENGINE_FILES, "person-link.js", "issue-scope.js", "issue-colors.js", "voting-record.js"];
function drawerWin(pagesSrc, pre) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = {};
  if (pre) pre(win);
  if (pagesSrc != null) vm.runInContext(pagesSrc, ctx, { filename: "bill-pages.js" });
  for (const f of DRAWER) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch {} }
  return win;
}

// PROBE: a federal measure some drawer shows with a Congress.gov door but that
// has no page in the committed list. The list is a Proxy that records every
// key the drawer asks about, so the probe is one the drawer really looks up.
const asked = [];
const spy = drawerWin(null, (w) => {
  w.PDX_BILL_PAGES = new Proxy({}, { getOwnPropertyDescriptor(_t, k) { asked.push(String(k)); return undefined; } });
});
let probe = null;
for (const pid of [...corpus.byMember.keys()].slice(0, 80)) {
  const keys = new Set();
  for (const it of corpus.byMember.get(pid)) for (const g of (it.issues || [])) if (g && g.issueKey) keys.add(g.issueKey);
  for (const k of keys) {
    asked.length = 0;
    spy.PDXConsistency.gapViewHtml(pid, k);
    const hit = asked.find((a) => /^\d{3}\/(H\.R\.|S\.) \d+$/.test(a) && !SNAP[a]);
    if (hit) { probe = { pid, issue: k, key: hit }; break; }
  }
  if (probe) break;
}
must(probe, "no drawer shows a federal bill that lacks a page — nothing to probe with");
const [pCong, ...rest] = probe.key.split("/");
const pNum = rest.join("/");
const pUrl = P.billPageUrl(pCong, pNum);

// ── 1. a store-only bill is in the client list ───────────────────────────────
section(`1 · a bill only in the store is in the client list (${probe.key})`);
storeKeys = [P.pageStoreKey(pCong, pNum), P.pageStoreKey(119, "H.R. 99999")];
let { res, body } = await serve();
eq(res.status, 200, "served 200");
ok(/javascript/.test(res.headers.get("content-type") || "") && !res.headers.get("etag"), "served as a script, with the committed file's etag dropped");
eq(storeNames.at(-1), P.BILL_PAGES_STORE_NAME, "reads the store the bill job writes");
const merged = listOf(body);
eq([merged[probe.key], merged["119/H.R. 99999"]], [1, 1], "store-only bills keyed \"<congress>/<number>\" like the snapshot bills");
eq(Object.keys(merged).length, snapKeys.length + 2, "exactly the two store-only bills were added");
ok(body.startsWith(FILE), "the committed file is served unchanged ahead of the addition");

// ── 2. the drawer links it ──────────────────────────────────────────────────
section("2 · the person-page drawer links the generated page");
const before = drawerWin(FILE).PDXConsistency.gapViewHtml(probe.pid, probe.issue) || "";
ok(!before.includes(`href="${pUrl}"`), `premise: with the committed list alone, ${probe.pid}'s ${probe.issue} drawer has no link to ${pUrl}`);
const ON = drawerWin(body);
const after = ON.PDXConsistency.gapViewHtml(probe.pid, probe.issue) || "";
ok(after.includes(`<a class="pdxbill-page" href="${pUrl}"`), `the drawer prints a Bill page link to ${pUrl}`);
eq(ON.PDXShareLinks.bill(pCong, pNum).replace(/^https?:\/\/[^/]+/, ""), pUrl, "the drawer's link is the generated page's own /b/ address");
ok((after.match(/class="pdxbill-page"/g) || []).length === (before.match(/class="pdxbill-page"/g) || []).length + 1, "exactly one new link, nothing else in the drawer moved");
eq(after.replace(/<a class="pdxbill-page"[^>]*>Bill page<\/a>/g, ""), before.replace(/<a class="pdxbill-page"[^>]*>Bill page<\/a>/g, ""), "the drawer is otherwise identical");
// The snapshot probe the existing hop test uses still links.
ok((ON.PDXConsistency.gapViewHtml("curtis", "housing") || "").includes('<a class="pdxbill-page" href="/b/119/H.R.%206644"'), "a snapshot bill still links as before");

// ── 3. snapshot bills unchanged, no duplicates ──────────────────────────────
section("3 · snapshot bills stay, nothing listed twice");
ok(snapKeys.every((k) => merged[k] === 1), `all ${snapKeys.length} snapshot bills still listed`);
storeKeys = [P.pageStoreKey(119, "H.R. 6644"), P.pageStoreKey(pCong, pNum), P.pageStoreKey(pCong, pNum)];
({ body } = await serve());
const tail = body.slice(FILE.length);
ok(!tail.includes('"119/H.R. 6644"'), "a bill in both the snapshot and the store is not appended again");
eq((tail.match(new RegExp(JSON.stringify(probe.key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1, "a repeated store key is listed once");
storeKeys = [P.pageStoreKey(119, "H.R. 6644")];
({ body } = await serve());
eq(body, FILE, "a store holding only snapshot bills serves the committed file exactly");
storeKeys = ["us/119/not a bill", "other/119/H.R.%205"];
({ body } = await serve());
eq(body, FILE, "keys the job did not write add nothing");

// ── 4. failure → committed file ──────────────────────────────────────────────
section("4 · store unavailable");
storeKeys = [P.pageStoreKey(pCong, pNum)];
storeMode = "throw";
({ res, body } = await serve());
eq([res.status, body], [200, FILE], "a store error serves the committed list untouched");
storeMode = "hang";
const t0 = Date.now();
({ body } = await serve());
ok(body === FILE && Date.now() - t0 < 4000, "a store that never answers times out to the committed list");
storeMode = "ok";

// ── 5. no new route, no drawer change ───────────────────────────────────────
section("5 · no new route or drawer logic");
const src = R("netlify/edge-functions/bill-pages-client.ts");
eq([...src.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]), ["/bill-pages.js"], "the edge declares only /bill-pages.js");
ok(existsSync(join(ROOT, "bill-pages.js")) && R("person.html").includes('<script defer src="/bill-pages.js"></script>'), "…the script person.html already loads");
const others = readdirSync(join(ROOT, "netlify/edge-functions")).filter((f) => f !== "bill-pages-client.ts")
  .flatMap((f) => [...R(`netlify/edge-functions/${f}`).matchAll(/path:\s*(\[[^\]]*\]|["'][^"']+["'])/g)].map((m) => m[1]));
ok(!others.some((p) => p.includes("bill-pages")), "no other edge function serves the list");
ok(!readdirSync(join(ROOT, "netlify/functions")).some((f) => /bill-pages/.test(f)), "no bill-pages function");
ok(!/vote-actions/.test(src), "the edge reads only the page store, never the action tables");
let committed = true;
try { execFileSync("node", [join(ROOT, "scripts/gen-bill-pages.mjs"), "--check"], { stdio: "pipe" }); } catch { committed = false; }
ok(committed, "bill-pages.js is still exactly what its generator writes");
const diff = (() => { try { return execFileSync("git", ["diff", "HEAD", "--", "consistency.js"], { cwd: ROOT, encoding: "utf8" }); } catch { return null; } })();
// A later pass may edit consistency.js for its own reasons; what this pass
// guarantees is that none of those edits is bill-page or drawer-link logic.
const added = (diff || "").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
ok(!added.some((l) => /bill-pages|billPage|PDXBillPages|\/bill\//.test(l)),
  "consistency.js (the drawer) gained no bill-page logic");
const SW = R("sw.js");
ok(SW.includes("FRESH_FIRST.add('/bill-pages.js');") && SW.includes("  '/bill-pages.js',\n"), "the service worker fetches the list network-first and still precaches it for offline");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ bill-pages client list: ${passed} checks passed`);
process.exit(0);
