#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-provisions.mjs — "What this bill does" on generated bill pages
// ─────────────────────────────────────────────────────────────────────────────
// Bundles netlify/lib/bill-provisions-core.ts and -run.ts and runs them with an
// in-memory store and a scripted model, then renders a generated page through
// the real /b/ edge (share-preview.ts) and bill.html. Pins:
//   1. the source order: CRS summary → measure record → amendment purpose →
//      descriptive official title; placeholder purposes and short names get
//      no section, with a reason
//   2. the check: a point is kept only when its `from` is verbatim in the
//      source, it is 1–2 sentences, short, plain (grade gate), and carries no
//      jargon / loaded / method word
//   3. the run: hand-built pages are skipped, a current page is not redone, a
//      changed source is, a failure retries then gives up, and a run stays
//      inside its per-run cap
//   4. the page: the section prints under the topics with each point's source
//      wording, the source label + link and the AI disclosure; a record for
//      another address, or no record, prints nothing; hand-built pages never
//      read the store
//   5. scope: no scoring, stance, Evidence Locker or video module is imported
//
//   node scripts/test-bill-provisions.mjs   (no database, no network)

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
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

const dir = mkdtempSync(join(tmpdir(), "bp-prov-test-"));
const build = async (entry, out) => {
  await esbuild.build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const C = await build(join(ROOT, "netlify/lib/bill-provisions-core.ts"), join(dir, "core.mjs"));
const R = await build(join(ROOT, "netlify/lib/bill-provisions-run.ts"), join(dir, "run.mjs"));

const CRS = "Nuclear REFUEL Act This bill directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities that reprocess certain spent nuclear fuel&nbsp;(i.e., radioactive waste) under regulations for special nuclear material. The bill applies to domestic facilities that reprocess spent nuclear fuel in a manner that does not isolate plutonium.";
const bill = (o = {}) => ({ congress: 119, number: "H.R. 3978", measureType: "bill", title: "Nuclear REFUEL Act", summary: CRS, sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/3978", ...o });

// ── 1. source order ─────────────────────────────────────────────────────────
section("1 · source order");
{
  const a = C.pickSource(bill());
  eq(a.source?.kind, "crs_summary", "a bill with a CRS summary uses it");
  ok(a.source.text.startsWith("This bill directs"), "the CRS lead-in (the measure's name) is trimmed");
  ok(!a.source.text.includes("&nbsp;"), "entities are cleaned");
  eq(C.pickSource(bill({ summary: "", measureSummary: "This bill requires the Department of Energy to publish a yearly report on spent fuel storage." })).source?.kind, "measure_record", "no CRS summary → the measure record's summary");
  eq(C.pickSource(bill({ measureType: "amendment", number: "S.Amdt. 4236", title: "To strike all earmarks.", summary: "" })).source?.kind, "amendment_purpose", "an amendment's stated purpose");
  const sub = C.pickSource(bill({ measureType: "amendment", number: "S.Amdt. 2307", title: "In the nature of a substitute.", summary: "" }));
  ok(!sub.source && /placeholder/.test(sub.reason), "placeholder purpose → no section, with a reason");
  ok(!C.pickSource(bill({ measureType: "amendment", title: "To improve the bill.", summary: "" })).source, "\"To improve the bill.\" is a placeholder");
  eq(C.pickSource(bill({ summary: "", number: "S.J.Res. 188", measureType: "resolution", title: "A joint resolution providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Environmental Protection Agency relating to air standards." })).source?.kind, "official_title", "a descriptive official title when nothing better exists");
  const short = C.pickSource(bill({ summary: "", title: "Coast Guard Authorization Act of 2025" }));
  ok(!short.source && /short name/.test(short.reason), "a short name is not a source");
  eq(C.pickSource(bill({ summary: "", measureSummary: "" , title: "Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the Gulf of America." })).source?.kind, "official_title", "a House rule's long title is a source");
  ok(C.provisionsSignature(a.source) !== C.provisionsSignature(C.pickSource(bill({ summary: CRS + " More text here about the bill." })).source), "a changed source changes the signature");
}

// ── 2. the check ────────────────────────────────────────────────────────────
section("2 · the check");
{
  const src = C.pickSource(bill()).source;
  const r = C.checkPoints([
    { text: "Tells the Nuclear Regulatory Commission to license future plants that recycle used nuclear fuel.", from: "directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities" },
    { text: "Covers only U.S. plants that do not separate out plutonium.", from: "The bill applies to domestic facilities that reprocess spent nuclear fuel in a manner that does not isolate plutonium." },
    { text: "Bans all nuclear power.", from: "bans all nuclear power plants in the country" },
    { text: "Directs the Commission pursuant to the law to license plants.", from: "directs the Nuclear Regulatory Commission (NRC) to license" },
    { text: "A historic step to license future plants.", from: "to license future recycling facilities" },
    { text: "Licenses plants. Under new rules. For fuel. Forever.", from: "to license future recycling facilities" },
    { text: "Requires the commission to promote the comprehensive implementation of administratively streamlined authorization methodologies for reprocessing infrastructure.", from: "to license future recycling facilities" },
    { text: "Tells the Nuclear Regulatory Commission to license future plants that recycle used nuclear fuel.", from: "directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities" },
  ], src);
  eq(r.items.length, 2, "two points survive");
  ok(r.items[0].q === "directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities", "the quote is stored as the source spells it");
  const why = r.dropped.map((d) => d.why);
  ok(why.includes("source wording not found verbatim"), "invented wording is dropped");
  ok(why.some((w) => w.startsWith("jargon")), "jargon is dropped");
  ok(why.some((w) => w.startsWith("loaded word")), "loaded words are dropped");
  ok(why.includes("more than 2 sentences"), "more than two sentences is dropped");
  ok(why.some((w) => w.startsWith("reading grade")), "a hard-to-read point is dropped");
  ok(why.includes("duplicate"), "duplicates are dropped");
  ok(C.gradeLevel("Makes the Federal Trade Commission responsible for enforcing these rules.") <= C.MAX_GRADE, "agency names do not fail the grade gate");
  ok(C.checkPoints([{ text: "Renames the Gulf of Mexico as the “Gulf of America.”", from: "to rename the Gulf of Mexico" }], { kind: "official_title", text: "Providing for consideration of the bill (H.R. 276) to rename the Gulf of Mexico as the Gulf of America.", url: "", label: "" }).items.length === 1, "a point ending in a closing quote is a sentence");
  eq(C.parseModelJson('```json\n{"points":[{"text":"A.","from":"b"}]}\n```'), [{ text: "A.", from: "b" }], "fenced JSON parses");
  eq(C.parseModelJson("no json here"), null, "garbage parses to null");
}

// ── 3. the run ──────────────────────────────────────────────────────────────
section("3 · the run");
const GOOD = JSON.stringify({ points: [
  { text: "Tells the Nuclear Regulatory Commission to license future plants that recycle used nuclear fuel.", from: "directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities" },
  { text: "Covers only U.S. plants that do not separate out plutonium.", from: "The bill applies to domestic facilities that reprocess spent nuclear fuel in a manner that does not isolate plutonium." },
] });
const memStore = () => {
  const m = new Map();
  return { m, get: async (k) => m.get(k) ?? null, setJSON: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); }, list: async ({ prefix }) => ({ blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }) };
};
const NOW = new Date("2026-11-21T12:00:00Z");
const rows = new Map([
  ["119|H.R. 3978", bill()],
  ["119|S.Amdt. 2307", bill({ number: "S.Amdt. 2307", measureType: "amendment", title: "In the nature of a substitute.", summary: "" })],
  ["119|H.R. 1", bill({ number: "H.R. 1", title: "One Big Beautiful Bill Act" })],
]);
const pageKeys = ["us/119/H.R.%203978", "us/119/S.Amdt.%202307", "us/119/H.R.%201", "index/pages-v1"];
const handBuilt = new Set(["119|H.R. 1"]);
const inputs = async (wanted) => new Map(wanted.map((w) => [`${w.congress}|${w.number}`, rows.get(`${w.congress}|${w.number}`)]).filter((x) => x[1]));
{
  const store = memStore();
  const asked = [];
  const { report, state } = await R.runProvisions({ pageKeys, handBuilt, inputs, generate: async (s, u) => { asked.push(u); return GOOD; }, store, state: null, now: () => NOW, log: () => {} });
  eq([report.pages, report.handBuilt, report.generated, report.unavailable, report.withSection], [3, 1, 1, 1, 1], "3 pages: 1 hand-built skipped, 1 generated, 1 with no source");
  ok(!asked.some((u) => u.includes("H.R. 1 ")) && !store.m.has("us/119/H.R.%201"), "the hand-built page is never touched");
  const rec = store.m.get("us/119/H.R.%203978");
  eq([rec.status, rec.items.length, rec.src.kind], ["ok", 2, "crs_summary"], "the record holds two checked points from the CRS summary");
  ok(asked[0].includes("<source>") && asked[0].includes("This bill directs"), "the model is handed the source as data");
  eq(store.m.get("us/119/S.Amdt.%202307").status, "unavailable", "a page with no source gets a reason record");
  // Second run: nothing changed → no model call.
  let calls = 0;
  const again = await R.runProvisions({ pageKeys, handBuilt, inputs, generate: async () => { calls++; return GOOD; }, store, state, now: () => NOW, log: () => {} });
  eq([calls, again.report.generated, again.report.withSection], [0, 0, 1], "a current page is not redone");
  // A late, longer CRS summary → redone.
  rows.set("119|H.R. 3978", bill({ summary: CRS + " The licensing process under regulations for special nuclear material has fewer steps." }));
  const late = await R.runProvisions({ pageKeys, handBuilt, inputs, generate: async () => { calls++; return GOOD; }, store, state: again.state, now: () => NOW, log: () => {} });
  eq([calls, late.report.generated], [1, 1], "a changed source is redone");
  rows.set("119|H.R. 3978", bill());
}
{
  // Failures retry (with a second try inside the run), then give up.
  const store = memStore();
  let st = null; let calls = 0; const logs = [];
  for (let i = 0; i < C.MAX_ATTEMPTS + 1; i++) {
    ({ state: st } = await R.runProvisions({ pageKeys: ["us/119/H.R.%203978"], handBuilt: new Set(), inputs, generate: async () => { calls++; return '{"points":[{"text":"Bans all nuclear power.","from":"bans nuclear power"}]}'; }, store, state: st, now: () => NOW, log: (l) => logs.push(l) }));
  }
  eq(calls, C.MAX_ATTEMPTS * 2, "each attempt makes one retry call, and the run gives up after MAX_ATTEMPTS");
  ok(logs.some((l) => /GAVE UP/.test(l)) && logs.some((l) => /RETRY LATER/.test(l)), "retry / give-up are logged");
  ok(!store.m.has("us/119/H.R.%203978"), "a failed page publishes nothing");
}
{
  // Per-run cap.
  const many = Array.from({ length: 5 }, (_, i) => `us/119/H.R.%20${100 + i}`);
  const inp = async (w) => new Map(w.map((x) => [`${x.congress}|${x.number}`, bill({ number: x.number })]));
  const { report } = await R.runProvisions({ pageKeys: many, handBuilt: new Set(), inputs: inp, generate: async () => GOOD, store: memStore(), state: null, now: () => NOW, maxPerRun: 2, log: () => {} });
  eq([report.generated, report.pending], [2, 3], "a run stays inside its cap; the rest stay queued");
}

// ── 4. the page ─────────────────────────────────────────────────────────────
section("4 · rendered on the generated page");
{
  const entry = join(dir, "edge-entry.ts");
  writeFileSync(entry, `export { default as edge } from ${JSON.stringify(join(ROOT, "netlify/edge-functions/share-preview.ts"))};
export { setGeneratedBillPageReader, setBillProvisionsReader } from ${JSON.stringify(join(ROOT, "netlify/lib/share-target.ts"))};`);
  const E = await build(entry, join(dir, "edge.mjs"));
  const page = { v: "va-page-v1", doc: { s: "119", n: "H.R. 3978", c: "house", t: "Nuclear REFUEL Act", m: [{ k: "energy_production" }], rs: "https://www.congress.gov/bill/119th-congress/house-bill/3978" } };
  const src = C.pickSource(bill()).source;
  const prov = C.okRecord(bill(), src, C.checkPoints(JSON.parse(GOOD).points, src).items, NOW);
  E.setGeneratedBillPageReader(async (k) => (k === "us/119/H.R.%203978" ? page : null));
  E.setBillProvisionsReader(async (k) => (k === "us/119/H.R.%203978" ? prov : null));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("{}", { status: 404 });
  const html = read("bill.html");
  const ctx = { next: async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const body = await (await E.edge(new Request("https://politidex.fyi/b/119/H.R.%203978"), ctx)).text();
  ok(/<section class="pdx-bill-issues pdx-bill-does" data-pdx-bill-provisions data-source="crs_summary"><h2>What this bill does<\/h2>/.test(body), "the section prints with its heading");
  ok(body.includes("Tells the Nuclear Regulatory Commission to license future plants that recycle used nuclear fuel."), "a plain-language point prints");
  ok(body.includes("<summary>From the CRS summary</summary>") && body.includes("“directs the Nuclear Regulatory Commission (NRC) to license future recycling facilities”"), "each point carries its source wording");
  ok(body.includes("Congressional Research Service summary") && body.includes('href="https://www.congress.gov/bill/119th-congress/house-bill/3978"'), "the source is named and linked");
  ok(/data-pdx-bill-provisions-note>Rewritten in plain language by an AI model/.test(body), "the rewriting is disclosed");
  const iIssues = body.indexOf("data-pdx-bill-issues"), iDoes = body.indexOf("data-pdx-bill-provisions");
  ok(iIssues > 0 && iDoes > iIssues, "the section sits under the topics");
  // A record for another address is never printed here.
  E.setBillProvisionsReader(async () => ({ ...prov, n: "H.R. 9" }));
  const other = await (await E.edge(new Request("https://politidex.fyi/b/119/H.R.%203978"), ctx)).text();
  ok(!other.includes("data-pdx-bill-provisions") && other.includes('<h1 class="pdx-bill-num">H.R. 3978</h1>'), "a mismatched record prints nothing; the page still renders");
  // No record / a failing reader: the page is unchanged.
  E.setBillProvisionsReader(async () => { throw new Error("boom"); });
  const none = await (await E.edge(new Request("https://politidex.fyi/b/119/H.R.%203978"), ctx)).text();
  ok(!none.includes("data-pdx-bill-provisions") && none.includes("data-pdx-bill-issues"), "a failing read prints the page without the section");
  // A hand-built page never reads the store.
  E.setBillProvisionsReader(async () => { throw new Error("must not be asked"); });
  E.setGeneratedBillPageReader(async () => { throw new Error("must not be asked"); });
  const snap = await (await E.edge(new Request("https://politidex.fyi/b/119/H.R.%201"), ctx)).text();
  ok(snap.includes('<h1 class="pdx-bill-num">H.R. 1</h1>') && !snap.includes("data-pdx-bill-provisions"), "hand-built pages are unchanged");
  E.setGeneratedBillPageReader(null); E.setBillProvisionsReader(null);
  globalThis.fetch = realFetch;
}

// ── 5. scope ────────────────────────────────────────────────────────────────
section("5 · scope");
{
  const importsOf = (src) => [...src.matchAll(/^import[^;]*from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  for (const f of ["netlify/lib/bill-provisions-core.ts", "netlify/lib/bill-provisions-run.ts", "netlify/functions/bill-provisions.mts", "netlify/functions/bill-provisions-cron.mts"]) {
    ok(!importsOf(read(f)).some((p) => /stance|vr-axis|vr-pack|raw-ingest-core|evidence-locker|video|score/.test(p)), `${f} imports nothing that scores, or touches stances, the Locker or video`);
  }
  ok(!/from ["'][^"']*(@netlify\/blobs|db\/(index|schema))/.test(read("netlify/lib/bill-provisions-core.ts") + read("netlify/lib/bill-provisions-run.ts")), "the core and run touch no Blobs or database themselves");
  const fn = read("netlify/functions/bill-provisions.mts");
  ok(!/\.(insert|update|delete)\(/.test(fn.replace(/store\.delete\(PROVISIONS_LOCK_KEY\)/, "")), "the worker writes no database rows");
  ok(/background:\s*true/.test(fn) && /schedule:\s*"\*\/30 \* \* \* \*"/.test(read("netlify/functions/bill-provisions-cron.mts")), "a background worker woken every 30 minutes");
}

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ bill provisions: ${passed} checks passed`);
