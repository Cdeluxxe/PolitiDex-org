#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-one-label.mjs — the bill document and its panel name an issue once
// ─────────────────────────────────────────────────────────────────────────────
// /b/119/H.J.Res.%20131 listed Protect Public Lands, Energy & Resource
// Development, Expand Domestic Energy Production and Cut Federal Red Tape. The
// panel opened over the same document listed Lands Preserve, Lands Energy,
// Energy Production and Gov Regulation. Same four mappings, two label tables, and
// a reader could count eight topics. bill.html never loaded ISSUE_MAP, so every
// label in the panel fell through to the key prettified into words.
//
// What must stay true:
//
//   1. ONE LABEL. On bill.html, as the browser runs it (the document's own
//      scripts, in its own order), H.J.Res. 131's letterhead chips, its "Every
//      topic this act touches" rows and its "Explore these issues" links carry
//      ISSUE_MAP's label for each key — the same four the seam lists, in either
//      order (the seam prints the label without its leading icon). No
//      prettified key is on the panel.
//   2. COUNTS STAY COUNTS. The letterhead still says "4 topics mapped". No score
//      and no direction word arrives on a chip; the "A Yea advances this" line
//      stays on its row and only there.
//   3. A KEY WITH NO ISSUE_MAP ROW keeps the words it had: the key prettified.
//      The one used here, NOT_A_KEY, is named below and is not relabelled by
//      guess.
//   4. THE DOCUMENT DOES NOT CHANGE. The seam the edge writes for H.J.Res. 131
//      is byte-identical to the pinned copy.
//   5. MUTATIONS ARE CAUGHT. bill.html without issue-map.js, or a bill-detail.js
//      that prettifies the key first, puts Lands Preserve back and fails 1.
//
//   node scripts/test-bill-one-label.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { issueLabels } from "./gen-bill-docs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill one label: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const ACCEPT = "/b/119/H.J.Res.%20131";
const BILL_HTML = R("bill.html");
const BD_SRC = R("bill-detail.js");
const LABELS = issueLabels(R("issue-map.js"));
const stripEmoji = (s) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const prettify = (k) => String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const plain = (h) => unescape(String(h).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const sorted = (a) => [...a].sort();

// A key that is not in ISSUE_MAP and never will be: the unmapped case, named.
const NOT_A_KEY = "zz_not_an_issue_key";
must(!LABELS[NOT_A_KEY], `${NOT_A_KEY} must have no ISSUE_MAP row`);

// H.J.Res. 131's mappings, read the way the document's generator reads them.
const HJ = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === "H.J.Res. 131");
must(HJ && HJ.issues, "the published addresses hold H.J.Res. 131 and its mapped issues");
const KEYS = [...HJ.issues];
must(KEYS.length === 4, `H.J.Res. 131 is mapped to four keys (got ${KEYS.length})`);
for (const k of KEYS) must(LABELS[k], `${k} has an ISSUE_MAP label`);

// ── the document ─────────────────────────────────────────────────────────────
const outDir = mkdtempSync(join(tmpdir(), "bill-one-label-"));
const EDGE_PATH = join(ROOT, "netlify/edge-functions/share-preview.ts");
const edgeOut = join(outDir, "edge.mjs");
await esbuild.build({
  stdin: { contents: R("netlify/edge-functions/share-preview.ts"), resolveDir: dirname(EDGE_PATH), sourcefile: "share-preview.ts", loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: edgeOut, logLevel: "error",
});
const EDGE = (await import(edgeOut)).default;
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("offline"); }; // a held bill needs no network
const seamRe = /<!--pdx:bill-doc-->[\s\S]*?<!--\/pdx:bill-doc-->/;
const served = await (async () => {
  const ctx = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await EDGE(new Request(ORIGIN + ACCEPT), ctx);
  return res ? await res.text() : BILL_HTML;
})();
globalThis.fetch = realFetch;
const SEAM = (served.match(seamRe) || [""])[0];
must(SEAM.includes("H.J.Res. 131"), "the edge wrote H.J.Res. 131 into the seam");
const DOC_LABELS = [...SEAM.matchAll(/<span class="pdx-bill-iss-i">([\s\S]*?)<\/span>/g)].map((m) => plain(m[1]));

// ── the panel, on bill.html, with bill.html's own scripts ────────────────────
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
must(DOC_SCRIPTS.includes("bill-detail.js"), "bill.html loads the panel");

const mapping = (k, i) => ({ issueKey: k, supportMeaning: i % 2 ? "yea_opposes" : "yea_supports", rationale: "" });
function fixture(keys) {
  return {
    measure: { id: 131, number: "H.J.Res. 131", congress: 119, chamber: "house", status: "enacted", title: "Coastal Plain CRA" },
    issues: keys.map(mapping), rollcalls: [], positions: [], provisions: [], actions: [],
  };
}

async function panel(data, { scripts = DOC_SCRIPTS, bd = BD_SRC } = {}) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  win.location = { href: ORIGIN + ACCEPT, pathname: ACCEPT, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of scripts) vm.runInContext(f === "bill-detail.js" ? bd : R(f), ctx, { filename: f });
  win.PDXBills = { get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }), listSync: () => ({ items: [] }), isFollowed: () => false };
  win.PDXBillDetail.open(data.measure.id);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  return capture.innerHTML;
}
const chipsOf = (h) => [...h.matchAll(/<span class="bd-lh-chip-l">([\s\S]*?)<\/span>/g)].map((m) => plain(m[1]));
const rowsOf = (h) => [...h.matchAll(/<button type="button" class="bd-omni-issue bd-omni-link"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => plain(m[1]));
const exploreOf = (h) => [...h.matchAll(/<span class="bd-person-name">🔎 ([\s\S]*?)<\/span>/g)].map((m) => plain(m[1]));

// What is wrong with a panel, as a list, so a mutation can be shown to fail it.
function problems(html) {
  const out = [];
  const want = sorted(KEYS.map((k) => LABELS[k]));
  for (const [where, got] of [["letterhead chips", chipsOf(html)], ["every-topic rows", rowsOf(html)], ["explore links", exploreOf(html)]]) {
    if (JSON.stringify(sorted(got)) !== JSON.stringify(want)) out.push(`${where}: ${JSON.stringify(got)}, expected ISSUE_MAP's ${JSON.stringify(want)}`);
    if (JSON.stringify(sorted(got.map(stripEmoji))) !== JSON.stringify(sorted(DOC_LABELS))) out.push(`${where} do not name the seam's four issues`);
    for (const k of KEYS) if (got.includes(prettify(k))) out.push(`${where}: the prettified key ${JSON.stringify(prettify(k))} is back`);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the panel names H.J.Res. 131's issues with the seam's labels");
// ═════════════════════════════════════════════════════════════════════════════
eq(DOC_LABELS.length, 4, "the seam lists four issues");
eq(JSON.stringify(sorted(DOC_LABELS)), JSON.stringify(sorted(KEYS.map((k) => stripEmoji(LABELS[k])))), "the seam lists ISSUE_MAP's labels");
for (const l of ["Protect Public Lands", "Energy & Resource Development", "Expand Domestic Energy Production", "Cut Federal Red Tape"]) {
  ok(DOC_LABELS.includes(l), `the seam lists ${l}`);
}
const HTML = await panel(fixture(KEYS));
must(HTML.includes("bd-lh-chip-l"), "the panel rendered its letterhead");
for (const p of problems(HTML)) ok(false, p);
ok(!problems(HTML).length, "the panel's chips, rows and explore links are the seam's four issues");
ok(!/Lands Preserve|Lands Energy|Gov Regulation|>\s*Energy Production\s*</.test(HTML), "no prettified key is printed anywhere on the panel");
eq(chipsOf(HTML).length, 4, "four chips, not eight");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · counts stay counts; no direction word on a chip");
// ═════════════════════════════════════════════════════════════════════════════
ok(HTML.includes("4 topics mapped"), "the letterhead still says 4 topics mapped");
ok(!HTML.includes("8 topics mapped"), "…and not 8");
const CHIP_EXTRA = /\d\s?%|\bscore\b|\bgrade\b|\bsupports?\b|\bopposes?\b|\badvances?\b|\bcuts? against\b|\byea\b|\bnay\b|\bfor\b|\bagainst\b/i;
for (const m of HTML.matchAll(/<button type="button" class="bd-lh-chip"[\s\S]*?<\/button>/g)) {
  const t = plain(m[0]);
  ok(!CHIP_EXTRA.test(t), `a letterhead chip carries a score or direction word: ${JSON.stringify(t)}`);
}
const yeaRows = [...HTML.matchAll(/<div class="bd-omni-head">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
eq(yeaRows.length, 4, "four every-topic rows");
for (const r of yeaRows) ok(/A Yea (advances|cuts against) this/.test(r), "each every-topic row keeps its Yea direction line");
eq((HTML.match(/A Yea (advances|cuts against) this/g) || []).length, 4, "the Yea direction line is on the rows and nowhere else");

// ═════════════════════════════════════════════════════════════════════════════
section(`3 · a key with no ISSUE_MAP row (${NOT_A_KEY}) is unchanged`);
// ═════════════════════════════════════════════════════════════════════════════
{
  const withMap = await panel(fixture([NOT_A_KEY]));
  const without = await panel(fixture([NOT_A_KEY]), { scripts: DOC_SCRIPTS.filter((s) => s !== "issue-map.js") });
  eq(JSON.stringify(chipsOf(withMap)), JSON.stringify([prettify(NOT_A_KEY)]), `${NOT_A_KEY} keeps its prettified words on the chip`);
  eq(JSON.stringify(chipsOf(withMap)), JSON.stringify(chipsOf(without)), `${NOT_A_KEY}'s chip reads the same with the register loaded as without it`);
  eq(JSON.stringify(rowsOf(withMap)), JSON.stringify(rowsOf(without)), `${NOT_A_KEY}'s every-topic row is unchanged`);
  eq(JSON.stringify(exploreOf(withMap)), JSON.stringify(exploreOf(without)), `${NOT_A_KEY}'s explore link is unchanged`);
  ok(withMap.includes("1 topic mapped"), "an unmapped key is still counted once");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the document's seam is byte-identical for H.J.Res. 131");
// ═════════════════════════════════════════════════════════════════════════════
// Pinned from the seam the edge wrote before the panel was given ISSUE_MAP. A
// regenerated db/bill-docs.json that legitimately changes this bill's document
// moves this pin on purpose, in the same change.
const SEAM_SHA256 = "b65741c64b6f1f74022c1c4819c5dbe17375ef8c781e92a23418386aa4d056e3";
eq(createHash("sha256").update(SEAM, "utf8").digest("hex"), SEAM_SHA256, "H.J.Res. 131's seam is byte-identical");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const noMap = await panel(fixture(KEYS), { scripts: DOC_SCRIPTS.filter((s) => s !== "issue-map.js") });
  ok(problems(noMap).length > 0, "mutation \"bill.html without issue-map.js\" was not caught");
  ok(chipsOf(noMap).includes("Lands Preserve"), "…and it is the mutation that puts Lands Preserve back on the panel");
  const anchor = "  function issueLabel(k) {\n";
  must(BD_SRC.includes(anchor), "bill-detail.js still defines issueLabel(k)");
  const prettyFirst = BD_SRC.replace(anchor, anchor + "    if (k) return String(k).replace(/_/g, ' ').replace(/\\b\\w/g, function (c) { return c.toUpperCase(); });\n");
  const mutated = await panel(fixture(KEYS), { bd: prettyFirst });
  ok(problems(mutated).length > 0, "mutation \"issueLabel prettifies the key first\" was not caught");
  ok(chipsOf(mutated).includes("Lands Preserve"), "…and it puts Lands Preserve back on the panel");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ bill one label: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ bill one label: ${passed} checks passed`);
