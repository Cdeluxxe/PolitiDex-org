#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-sitemap-generated-bill-pages.mjs — generated bill pages are in sitemap.xml
// ─────────────────────────────────────────────────────────────────────────────
// Bundles netlify/edge-functions/sitemap-bill-pages.ts with @netlify/blobs
// replaced by an in-memory "bill-pages" store, and serves the real committed
// sitemap.xml through it. Pins:
//   1. a bill that exists only in the bill-pages store appears at its
//      /b/<congress>/<number> URL, in the snapshot bills' exact spelling
//   2. every committed entry, snapshot bills included, is still there
//      unchanged and in order; nothing is listed twice
//   3. the store's keys are the ones the bill job writes (same store name,
//      same key format)
//   4. a store failure or timeout serves the committed file untouched
//   5. no new route: the edge declares only /sitemap.xml, an existing file,
//      and the redirects, functions and edge paths are otherwise unchanged
//
//   node scripts/test-sitemap-generated-bill-pages.mjs   (no network)

import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "sitemap-bp-"));
const blobsStub = {
  name: "blobs-stub",
  setup(b) {
    b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: "blobs", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: `export function getStore(name) { return globalThis.__getStore(name); }`, loader: "js",
    }));
  },
};
const build = async (entry, out, plugins = []) => {
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: join(dir, out), logLevel: "silent", plugins });
  return import(pathToFileURL(join(dir, out)).href);
};
const EDGE = await build("netlify/edge-functions/sitemap-bill-pages.ts", "edge.mjs", [blobsStub]);
const L = await build("netlify/lib/sitemap-bill-pages.ts", "lib.mjs");
const P = await build("netlify/lib/vote-actions-pages.ts", "pages.mjs");

const SITEMAP = read("sitemap.xml");
const locs = (x) => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const snapshotLocs = locs(SITEMAP);
const snapshotBills = snapshotLocs.filter((u) => u.includes("/b/"));
ok(snapshotBills.includes("https://politidex.fyi/b/119/H.R.%201"), "fixture premise: the committed sitemap lists snapshot bill 119 H.R. 1");

// The keys the bill job writes, built with its own key function.
const keysOf = (pairs) => pairs.map(([c, n]) => P.pageStoreKey(c, n));
let storeKeys = [], storeCalls = [], storeMode = "ok";
globalThis.__getStore = (name) => {
  storeCalls.push(name);
  return {
    async list({ prefix }) {
      if (storeMode === "throw") throw new Error("blobs unavailable");
      if (storeMode === "hang") return new Promise(() => {});
      return { blobs: storeKeys.filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: "x" })), directories: [] };
    },
  };
};
const serve = async () => {
  const ctx = { next: async () => new Response(SITEMAP, { status: 200, headers: { "content-type": "application/xml", "content-length": String(SITEMAP.length) } }) };
  const res = await EDGE.default(new Request("https://politidex.fyi/sitemap.xml"), ctx);
  return { res, body: await res.text() };
};

// ── 1. a store-only bill is listed ───────────────────────────────────────────
section("1 · a bill only in the bill-pages store appears at its /b/ URL");
storeKeys = keysOf([[119, "H.R. 7000"], [118, "S.J.Res. 99"], [117, "H.Amdt. 12"]]);
let { res, body } = await serve();
eq(res.status, 200, "sitemap answers 200");
ok(/application\/xml/.test(res.headers.get("content-type") || ""), "still served as XML");
eq(storeCalls.at(-1), P.BILL_PAGES_STORE_NAME, "reads the store the bill job writes");
for (const u of ["https://politidex.fyi/b/119/H.R.%207000", "https://politidex.fyi/b/118/S.J.Res.%2099", "https://politidex.fyi/b/117/H.Amdt.%2012"]) {
  ok(body.includes(`  <url><loc>${u}</loc></url>\n`), `${u} listed in the generator's line format`);
}
eq(P.billPageUrl(119, "H.R. 7000"), "/b/119/H.R.%207000", "the page's own address is the URL listed");
eq(locs(body).length, snapshotLocs.length + 3, "exactly the three store-only bills were added");
ok(body.trimEnd().endsWith("</urlset>") && body.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "still one well-formed urlset");

// ── 2. the committed entries are unchanged ───────────────────────────────────
section("2 · snapshot bills and every other entry stay as they were");
eq(locs(body).slice(0, snapshotLocs.length), snapshotLocs, "every committed entry, in order, unchanged");
ok(snapshotBills.every((u) => locs(body).includes(u)), `all ${snapshotBills.length} snapshot bills still listed`);
eq(body.slice(0, SITEMAP.lastIndexOf("</urlset>")), SITEMAP.slice(0, SITEMAP.lastIndexOf("</urlset>")), "the committed text before </urlset> is byte-identical");
// A store record for a snapshot bill (or a repeat) is not listed twice.
storeKeys = keysOf([[119, "H.R. 1"], [119, "H.R. 7000"], [119, "H.R. 7000"]]);
({ body } = await serve());
eq(locs(body).filter((u) => u === "https://politidex.fyi/b/119/H.R.%201").length, 1, "a snapshot bill also in the store is listed once");
eq(locs(body).length, snapshotLocs.length + 1, "duplicates collapse to one line");
// Keys the job did not write are ignored.
storeKeys = ["us/119/not a bill", "us/abc/H.R.%201", "other/119/H.R.%205", "us/119/H.R.%20<5>"];
({ body } = await serve());
eq(body, SITEMAP, "foreign or malformed keys add nothing");
storeKeys = [];
({ body } = await serve());
eq(body, SITEMAP, "an empty store serves the committed file exactly");

// ── 3. failure → committed file ──────────────────────────────────────────────
section("3 · store unavailable");
storeKeys = keysOf([[119, "H.R. 7000"]]);
storeMode = "throw";
({ res, body } = await serve());
eq([res.status, body], [200, SITEMAP], "a store error serves the committed sitemap untouched");
storeMode = "hang";
const t0 = Date.now();
({ body } = await serve());
ok(body === SITEMAP && Date.now() - t0 < 5000, "a store that never answers times out to the committed sitemap");
storeMode = "ok";
eq(L.mergeBillPages("<urlset></urlset>", keysOf([[119, "H.R. 7000"]])).added, 1, "pure merge adds the line");
eq(L.mergeBillPages("not xml", keysOf([[119, "H.R. 7000"]])).xml, "not xml", "a document with no urlset is returned as-is");

// ── 4. no new route ──────────────────────────────────────────────────────────
section("4 · no new route");
const edgeSrc = read("netlify/edge-functions/sitemap-bill-pages.ts");
eq([...edgeSrc.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]), ["/sitemap.xml"], "the edge declares only /sitemap.xml");
ok(existsSync(join(ROOT, "sitemap.xml")) && /Sitemap: https:\/\/politidex\.fyi\/sitemap\.xml/.test(read("robots.txt")), "…which is the existing, already-advertised sitemap file");
const paths = readdirSync(join(ROOT, "netlify/edge-functions")).filter((f) => f !== "sitemap-bill-pages.ts")
  .flatMap((f) => [...read(`netlify/edge-functions/${f}`).matchAll(/path:\s*(\[[^\]]*\]|["'][^"']+["'])/g)].map((m) => m[1]));
ok(!paths.some((p) => p.includes("sitemap")), "no other edge function touches the sitemap");
ok(!/sitemap/i.test(read("netlify.toml").split("\n").filter((l) => /^\s*(from|to)\s*=/.test(l)).join("\n")), "no redirect added for the sitemap");
ok(!readdirSync(join(ROOT, "netlify/functions")).some((f) => /sitemap/.test(f)), "no sitemap function");
ok(!/vote-actions/.test(edgeSrc), "the edge reads only the page store, never the action tables");
eq(L.BILL_PAGES_STORE, P.BILL_PAGES_STORE_NAME, "one store name on both sides");
ok(read("scripts/gen-sitemap.mjs").includes('export const ORIGIN = "' + L.SITEMAP_ORIGIN + '"'), "same origin as the generator");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ sitemap generated bill pages: ${passed} checks passed`);
process.exit(0);
