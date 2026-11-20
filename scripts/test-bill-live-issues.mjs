#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-live-issues.mjs — bill pages and person bill lists read live mappings
// ─────────────────────────────────────────────────────────────────────────────
// Covers the live overlay (netlify/lib/bill-live-issues.ts):
//   1. a reviewed mapping appears on its /b/ document and person bill list
//      without regenerating db/bill-docs.json / person-bills.json
//   2. proposed and rejected rows never appear on either
//   3. curated mappings appear exactly as before: for EVERY bill document the
//      edge-written HTML with the live table laid over it (the table holding the
//      snapshot's own keys) is byte-identical to the snapshot-only HTML, and so is
//      the output when the live table cannot be reached
//   4. the person list's tags are the bill page's issues, in the page's order
//
// HOW REAL THIS IS. The edge handler (netlify/edge-functions/share-preview.ts,
// with share-target.ts and bill-live-issues.ts) is bundled with esbuild and
// EXECUTED; only fetch (the Function's answer) and context.next() (bill.html) are
// stand-ins. The live table is built by the shipping liveBillTable() from fixture
// mapping rows, the same function GET /api/voting-record/measures?view=bill-issue-keys
// runs over its query. person-bills.js runs in a vm sandbox with a fake fetch.
//
//   node scripts/test-bill-live-issues.mjs
//
// Needs no database and no network.

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { issueLabels } from "./gen-bill-docs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// A bill file published from its ground-truth ledger (db/bill-standard/, `ld`)
// has no row in the migrations or db/bill-record.json to hold it to; the ledger
// standard (test-bill-standard.mjs) and test-baaja-bill-file.mjs check it.
const DOCS = Object.fromEntries(Object.entries(JSON.parse(read("db/bill-docs.json")).docs).filter(([, d]) => !d.ld));
const TABLE = JSON.parse(read("person-bills.json"));
const ISSUE_KEYS = new Set(JSON.parse(read("db/issue-keys.json")).keys);
const LABELS = issueLabels(read("issue-map.js"));
const strip = (s) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const BILL_HTML = read("bill.html");

// ── Bundle the edge handler + the shared module into one instance ────────────
const TMP = mkdtempSync(join(tmpdir(), "bill-live-test-"));
const entry = join(TMP, "entry.ts");
writeFileSync(entry, `
  export { default as handler } from ${JSON.stringify(join(ROOT, "netlify/edge-functions/share-preview.ts"))};
  export { resetLiveBillIssues } from ${JSON.stringify(join(ROOT, "netlify/lib/share-target.ts"))};
  export * as L from ${JSON.stringify(join(ROOT, "netlify/lib/bill-live-issues.ts"))};
`);
const out = join(TMP, "edge.mjs");
await esbuild.build({ entryPoints: [entry], bundle: true, format: "esm", platform: "neutral", outfile: out, logLevel: "silent", mainFields: ["module", "main"] });
const E = await import(pathToFileURL(out).href);
const L = E.L;

// The Function's answer, swapped per scenario.
let LIVE = null; // null → the Function is unreachable
let fetchCalls = 0;
globalThis.fetch = async (u) => {
  fetchCalls++;
  if (String(u).includes("/api/voting-record/measures?view=bill-issue-keys") && LIVE) {
    return new Response(JSON.stringify({ mappingVersion: "m-test", bills: LIVE }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("{}", { status: 503 });
};
const context = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html" } }) };
async function page(sitting, number) {
  E.resetLiveBillIssues();
  const url = `https://politidex.fyi/b/${encodeURIComponent(sitting)}/${encodeURIComponent(number)}`;
  const res = await E.handler(new Request(url), context);
  return res ? await res.text() : "";
}
const docBody = (html) => (html.match(/<!--pdx:bill-doc-->([\s\S]*?)<!--\/pdx:bill-doc-->/) || [])[1] || "";
const tagsOn = (html) => [...docBody(html).matchAll(/data-pdx-bill-tag="([^"]+)"/g)].map((m) => m[1]);
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const listedOn = (html) => [...docBody(html).matchAll(/<li data-pdx-bill-issue><span class="pdx-bill-iss-i">([^<]*)<\/span>/g)].map((m) => unesc(m[1]));

// The live table every scenario starts from: the snapshot's own keys, as curated.
const rowsFromSnapshot = () => Object.values(DOCS).flatMap((d) =>
  (d.m || []).filter((x) => x.k).map((x) => ({ sitting: d.s, number: d.n, sourceUrl: "https://www.congress.gov/x", issueKey: x.k, reviewStatus: "curated" })));
const known = (k) => ISSUE_KEYS.has(k);

// A bill with a sponsor on file (so it is on a person list) and room for a new key.
const pick = Object.values(DOCS).find((d) => d.sp && (d.sp.s || []).length && (d.m || []).length >= 1 && /^\d+$/.test(d.s));
if (!pick) { console.error("no fixture bill"); process.exit(1); }
const pickKeys = new Set((pick.m || []).map((x) => x.k));
const free = Object.keys(LABELS).filter((k) => ISSUE_KEYS.has(k) && !pickKeys.has(k) && strip(LABELS[k]));
const [REVIEWED, PROPOSED, REJECTED] = free;
const sponsor = pick.sp.s[0];

function liveWith(extra) {
  return L.liveBillTable([...rowsFromSnapshot(), ...extra.map((x) => ({ sitting: pick.s, number: pick.n, sourceUrl: "https://www.congress.gov/x", ...x }))], known);
}

// ═════════════════════════════════════════════════════════════════════════════
section("1. the live table holds only curated and reviewed rows");
{
  const t = liveWith([
    { issueKey: REVIEWED, reviewStatus: "reviewed" },
    { issueKey: PROPOSED, reviewStatus: "proposed" },
    { issueKey: REJECTED, reviewStatus: "rejected" },
    { issueKey: "not_a_real_key", reviewStatus: "curated" },
  ]);
  const keys = t[`${pick.s}|${pick.n}`] || [];
  ok(keys.includes(REVIEWED), "a reviewed row is in the table");
  ok(!keys.includes(PROPOSED), "a proposed row is not");
  ok(!keys.includes(REJECTED), "a rejected row is not");
  ok(!keys.includes("not_a_real_key"), "an unknown key is not");
  ok([...pickKeys].every((k) => keys.includes(k)), "every curated key is");
  eq(L.liveBillTable([{ sitting: "119", number: "H.R. 1", sourceUrl: null, issueKey: "housing" }], known)["119|H.R. 1"], undefined, "an unsourced measure is not");

  const VR = read("netlify/functions/voting-record.mts");
  const fn = VR.slice(VR.indexOf("async function buildBillIssueKeys"), VR.indexOf("async function getBillIssueKeys"));
  ok(/\.where\(verdictBearingMapping\(\)\)/.test(fn), "the Function's query filters to verdict-bearing rows in SQL");
  ok(/liveBillTable\(/.test(fn), "…and builds the table with the shared liveBillTable()");
  const g = VR.slice(VR.indexOf("async function getBillIssueKeys"), VR.indexOf("// ── GET /measures ──"));
  ok(/await mappingVersion\(\)/.test(g) && /_billIssueMemo\.version === version/.test(g), "the table is memoised on the pack mapping version");
  ok(/view"\) === "bill-issue-keys"/.test(VR), "served as a view of the existing /measures route (no new route)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2. a reviewed mapping reaches the bill page; proposed/rejected do not");
{
  LIVE = null;
  const before = await page(pick.s, pick.n);
  ok(!tagsOn(before).includes(REVIEWED), "precondition: the snapshot page does not carry the new key");

  LIVE = liveWith([
    { issueKey: REVIEWED, reviewStatus: "reviewed" },
    { issueKey: PROPOSED, reviewStatus: "proposed" },
    { issueKey: REJECTED, reviewStatus: "rejected" },
  ]);
  const after = await page(pick.s, pick.n);
  ok(tagsOn(after).includes(REVIEWED), `the reviewed key ${REVIEWED} is an "Also touches" chip`);
  ok(listedOn(after).includes(strip(LABELS[REVIEWED])), "…and listed under 'Every topic this act touches'");
  ok(!tagsOn(after).includes(PROPOSED) && !listedOn(after).includes(strip(LABELS[PROPOSED])), "the proposed key is nowhere on the page");
  ok(!tagsOn(after).includes(REJECTED) && !listedOn(after).includes(strip(LABELS[REJECTED])), "the rejected key is nowhere on the page");
  ok([...pickKeys].every((k) => tagsOn(after).includes(k)), "every curated chip is still there");
  const sorted = [...listedOn(after)].sort((a, b) => a.localeCompare(b));
  eq(JSON.stringify(listedOn(after)), JSON.stringify(sorted), "the merged list keeps the page's label order");
  // The curated lines are untouched; the new issue is listed bare (it has no stored line).
  for (const x of pick.m || []) if (x.l) ok(after.includes(x.l.replace(/&/g, "&amp;").replace(/</g, "&lt;")) || after.includes(x.l), `curated effect line kept for ${x.k}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3. every existing bill page is unchanged by the live overlay");
{
  const keys = Object.keys(DOCS);
  let same = 0, sameDown = 0;
  const diffs = [];
  const LIVE_SNAPSHOT = L.liveBillTable(rowsFromSnapshot(), known);
  for (const k of keys) {
    const d = DOCS[k];
    LIVE = null;
    const snap = await page(d.s, d.n); // the Function unreachable → snapshot only
    LIVE = LIVE_SNAPSHOT;
    const live = await page(d.s, d.n);
    if (snap === live) same++; else if (diffs.length < 5) diffs.push(k);
    // The previous output: the snapshot's own issue list, in its order.
    const want = (d.m || []).filter((x) => x.i).map((x) => x.i);
    if (JSON.stringify(listedOn(snap)) === JSON.stringify(want)) sameDown++;
  }
  eq(same, keys.length, `byte-identical HTML with the live table for every document (first differences: ${diffs.join(", ")})`);
  eq(sameDown, keys.length, "with the Function unreachable every page lists exactly the snapshot's issues");
  console.log(`      ${keys.length} bill documents compared`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4. person bill lists: snapshot tags, plus reviewed live keys only");
{
  const ISSUE_MAP = {};
  for (const [k, l] of Object.entries(LABELS)) ISSUE_MAP[k] = { label: l };
  const boot = (liveBills) => {
    const sb = {
      window: { ISSUE_MAP },
      document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null },
      setTimeout, clearTimeout, Promise,
      fetch: async (u) => {
        if (u === "/person-bills.json") return { ok: true, json: async () => JSON.parse(JSON.stringify(TABLE)) };
        if (String(u).includes("view=bill-issue-keys") && liveBills) return { ok: true, json: async () => ({ mappingVersion: "m-test", bills: liveBills }) };
        return { ok: false, json: async () => null };
      },
    };
    sb.window.document = sb.document;
    vm.runInNewContext(read("person-bills.js"), sb, { filename: "person-bills.js" });
    return sb.window.PDXPersonBills;
  };
  const tagKeys = (h, s, n) => {
    const at = h.indexOf(`data-pdx-sponsored-bill="${s}|${n}"`.replace(/&/g, "&amp;"));
    if (at < 0) return null;
    const li = h.slice(at, h.indexOf("</li>", at));
    return [...li.matchAll(/data-pdx-sponsored-issue="([^"]+)"/g)].map((m) => m[1]);
  };

  // Snapshot only (the Function unreachable): every row's tags are its bill page's issues.
  const PB0 = boot(null);
  const data0 = await PB0.load();
  let rowsOk = 0, rowsN = 0;
  for (const pid of Object.keys(TABLE.people)) {
    const h = PB0.html(PB0.rowsFor(data0, pid));
    for (const [i] of TABLE.people[pid]) {
      const b = TABLE.bills[i];
      const d = DOCS[`${b[0]}|${b[1]}`];
      const want = (d.m || []).filter((x) => x.k && x.i).map((x) => x.k);
      rowsN++;
      if (JSON.stringify(tagKeys(h, b[0], b[1])) === JSON.stringify(want)) rowsOk++;
    }
  }
  eq(rowsOk, rowsN, "every person-list row tags exactly its bill page's issues, in the page's order");
  ok(Object.values(DOCS).filter((d) => d.sp).every((d) => {
    const row = TABLE.bills.find((b) => b[0] === d.s && b[1] === d.n);
    return row && JSON.stringify(row[6]) === JSON.stringify((d.m || []).map((x) => x.k).filter(Boolean));
  }), "person-bills.json carries each bill's snapshot issue keys");

  // Live table with the snapshot's own keys: identical HTML.
  const PB1 = boot(L.liveBillTable(rowsFromSnapshot(), known));
  const data1 = await PB1.load();
  const h0 = PB0.html(PB0.rowsFor(data0, sponsor));
  eq(PB1.html(PB1.rowsFor(data1, sponsor)), h0, "a live table holding only curated keys changes no person list");

  // A reviewed mapping appears; proposed and rejected do not.
  const PB2 = boot(liveWith([
    { issueKey: REVIEWED, reviewStatus: "reviewed" },
    { issueKey: PROPOSED, reviewStatus: "proposed" },
    { issueKey: REJECTED, reviewStatus: "rejected" },
  ]));
  const data2 = await PB2.load();
  const h2 = PB2.html(PB2.rowsFor(data2, sponsor));
  const t2 = tagKeys(h2, pick.s, pick.n) || [];
  ok(t2.includes(REVIEWED), `the reviewed key ${REVIEWED} is a tag on ${sponsor}'s row for ${pick.n}`);
  ok(!t2.includes(PROPOSED), "the proposed key is not");
  ok(!t2.includes(REJECTED), "the rejected key is not");
  ok([...pickKeys].every((k) => t2.includes(k)), "the curated tags are all still there");
  ok(h2.includes(`href="/i/${REVIEWED}"`), "the tag opens the issue page");
  eq(h2.replace(/<a href="\/i\/[^"]+" data-pdx-sponsored-issue="[^"]+">[^<]*<\/a>/g, ""), h0.replace(/<a href="\/i\/[^"]+" data-pdx-sponsored-issue="[^"]+">[^<]*<\/a>/g, ""), "nothing else on the list moves");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5. refresh: a review moves the table on the next read");
{
  const PACK = read("netlify/lib/vr-pack.ts");
  ok(/review_status/.test(PACK.slice(PACK.indexOf("export async function mappingVersion"), PACK.indexOf("export function resetMappingVersionMemo"))),
    "review_status is in the mapping fingerprint the table is memoised on");
  const ST = read("netlify/lib/share-target.ts");
  ok(/LIVE_BILL_TTL_MS = 60_000/.test(ST), "the edge holds the table for at most a minute");
  ok(/doc = withLiveIssues\(doc, await liveBillIssues\(origin\)\)/.test(ST), "the bill target lays the live table over its document");
  ok(/view=bill-issue-keys/.test(read("person-bills.js")), "the person list reads the same table");
}

rmSync(TMP, { recursive: true, force: true });
console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
