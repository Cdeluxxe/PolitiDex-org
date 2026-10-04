#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-issues.mjs — the bill document names the issues its measure is mapped to
// ─────────────────────────────────────────────────────────────────────────────
// /b/119/H.J.Res.%20131 printed its number, sitting, title and stored effect
// lines, and the issues the act touches were only on the panel's chips. A
// crawler, and a reader with the panel closed, could not see the resolution is
// mapped to lands and to energy. The seam now lists them.
//
// What must stay true:
//
//   1. ONE ENTRY PER MAPPED ISSUE. H.J.Res. 131's seam has exactly one <li> per
//      issue the projection maps it to (with later re-keys and deletes
//      replayed), labelled with ISSUE_MAP's own label.
//   2. A LINE ONLY UNDER ITS OWN ISSUE. Each Arctic line sits under the issue it
//      is stored on and under no other. An <li> is the label, then that pair's
//      stored line if one passes the drawer's rule — and nothing else: no score,
//      no for/against, no direction word, no "primary".
//   3. A MAPPED ISSUE WITH NO LINE is listed bare, with no sentence invented.
//   4. NOTHING MAPPED, NOTHING SAID. A measure mapped to nothing gets no list and
//      no "touches none". An unknown number gets no issue list at all.
//   5. A CORRECTION IS HONOURED. A key a later migration deleted or re-keyed is
//      not printed (H.R. 1526 is not filed under "Balance the Budget").
//   6. MUTATIONS ARE CAUGHT. An edge that prints a score, a for/against, a
//      "primary", or another issue's line under this one fails the checks above.
//
//   node scripts/test-bill-issues.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { measureAddresses } from "./vr-measure-addresses.mjs";
import { effectOk, issueLabels } from "./gen-bill-docs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill issues: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const BILL_HTML = R("bill.html");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const seamRe = /<!--pdx:bill-doc-->[\s\S]*?<!--\/pdx:bill-doc-->/;
const seamOf = (html) => (html.match(seamRe) || [""])[0];
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const plain = (h) => unescape(String(h).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// The stores, read the way the generator reads them.
const LABELS = issueLabels(R("issue-map.js"));
const stripEmoji = (s) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const SRC = R("consistency.js");
function liftTable(name) {
  const a = SRC.indexOf(`var ${name} = {`);
  must(a !== -1, `consistency.js still carries ${name}`);
  return vm.runInNewContext("(" + SRC.slice(a + `var ${name} = `.length, SRC.indexOf("\n  };", a) + 4) + ")");
}
const EFFECT = liftTable("_DOS_EFFECT");
const MECH = liftTable("_DOS_MECH");
const storedLine = (num, cong, k) => effectOk(EFFECT[`${num}|${cong}|${k}`] || (MECH[`${num}|${cong}|${k}`] || {}).did || "");
const INDEX = measureAddresses(ROOT);
const addr = (s, n) => INDEX.published.find((a) => a.sitting === s && a.number === n);

// The edge, bundled — and bundled again from a mutated source on demand.
const outDir = mkdtempSync(join(tmpdir(), "bill-issues-"));
const EDGE_PATH = join(ROOT, "netlify/edge-functions/share-preview.ts");
const EDGE_SRC = readFileSync(EDGE_PATH, "utf8");
let built = 0;
async function edgeFrom(src) {
  const out = join(outDir, `edge-${built++}.mjs`);
  await esbuild.build({
    stdin: { contents: src, resolveDir: dirname(EDGE_PATH), sourcefile: "share-preview.ts", loader: "ts" },
    bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
  });
  return (await import(out)).default;
}
const realFetch = globalThis.fetch;
function stubFetch(answer) {
  globalThis.fetch = async () => {
    if (answer === "throw") throw new Error("offline");
    return new Response("{}", { status: answer, headers: { "content-type": "application/json" } });
  };
}
async function serve(edge, path) {
  const ctx = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await edge(new Request(ORIGIN + path), ctx);
  return res ? await res.text() : BILL_HTML;
}
const pathOf = (d) => `/b/${encodeURIComponent(d.s)}/${encodeURIComponent(d.n)}`;
const itemsOf = (seam) => [...seam.matchAll(/<li data-pdx-bill-issue>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

// What a document's issue list must be, from the stores themselves rather than
// from db/bill-docs.json — so a generator that drifted is caught here too.
function expected(s, n) {
  const a = addr(s, n);
  if (!a) return [];
  return [...a.issues]
    .map((k) => ({ k, i: stripEmoji(LABELS[k] || "") }))
    .filter((x) => x.i)
    .map((x) => ({ ...x, l: storedLine(n, s, x.k) }))
    .sort((p, q) => p.i.localeCompare(q.i));
}

// The checks, as a list of what is wrong — so a mutation can be shown to fail
// them. An <li> is exactly the label, then that pair's line if one is stored.
const EXTRA = /\d\s?%|\bscore\b|\bgrade\b|\bverdict\b|\bsupports?\b|\bopposes?\b|\bfor\b|\bagainst\b|\byeas?\b|\bnays?\b|\bdirection\b|\bprimary\b|\bweight\b/i;
function problems(seam, want) {
  const out = [];
  const items = itemsOf(seam);
  if (items.length !== want.length) out.push(`${items.length} issue entries, expected ${want.length}`);
  want.forEach((w, idx) => {
    const li = items[idx] || "";
    const label = plain((li.match(/<span class="pdx-bill-iss-i">([\s\S]*?)<\/span>/) || [])[1] || "");
    if (label !== w.i) out.push(`entry ${idx}: label ${JSON.stringify(label)}, expected ${JSON.stringify(w.i)}`);
    const line = plain((li.match(/<span class="pdx-bill-iss-l">([\s\S]*?)<\/span>/) || [])[1] || "");
    if (line !== w.l) out.push(`${w.i}: line ${JSON.stringify(line.slice(0, 50))}, expected ${JSON.stringify(w.l.slice(0, 50))}`);
    const whole = plain(li);
    if (whole !== [w.i, w.l].filter(Boolean).join(" ")) out.push(`${w.i}: the entry says more than its label and its line — ${JSON.stringify(whole.slice(0, 120))}`);
    const extra = whole.slice(w.i.length).replace(w.l, "");
    if (EXTRA.test(extra)) out.push(`${w.i}: a score, direction or "primary" word — ${JSON.stringify(extra.match(EXTRA)[0])}`);
  });
  return out;
}

const EDGE = await edgeFrom(EDGE_SRC);
stubFetch("throw"); // every held document is written with no network

// ═════════════════════════════════════════════════════════════════════════════
section("1 · H.J.Res. 131 names every issue it is mapped to");
// ═════════════════════════════════════════════════════════════════════════════
const ACCEPT = "/b/119/H.J.Res.%20131";
const hj = expected("119", "H.J.Res. 131");
must(hj.length >= 2, "H.J.Res. 131 is mapped to at least two labelled issues in the projection");
const hjSeam = seamOf(await serve(EDGE, ACCEPT));
for (const p of problems(hjSeam, hj)) ok(false, `H.J.Res. 131: ${p}`);
ok(true, "H.J.Res. 131's issue list matches the stores");
for (const w of hj) ok(hjSeam.includes(`<span class="pdx-bill-iss-i">${w.i.replace(/&/g, "&amp;")}</span>`), `H.J.Res. 131 names ${w.i}`);
const lands = hj.filter((w) => /Lands/i.test(w.i)), energy = hj.filter((w) => /Energy/i.test(w.i));
ok(lands.length >= 1, "H.J.Res. 131 is shown mapped to a lands issue");
ok(energy.length >= 1, "H.J.Res. 131 is shown mapped to an energy issue");
ok(hjSeam.includes("<h2>Every topic this act touches</h2>"), "the list carries the panel's own heading");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · each Arctic line sits only under the issue it is stored on");
// ═════════════════════════════════════════════════════════════════════════════
{
  const items = itemsOf(hjSeam);
  const ARCTIC = "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.";
  eq(storedLine("H.J.Res. 131", "119", "lands_preserve"), ARCTIC, "the Arctic withdrawal line is stored on lands_preserve");
  const holders = items.filter((li) => li.includes(ARCTIC)).map((li) => plain((li.match(/pdx-bill-iss-i">([^<]*)</) || [])[1] || ""));
  eq(holders.length, 1, "the Arctic withdrawal line is printed exactly once");
  eq(holders[0], stripEmoji(LABELS.lands_preserve), "…under the issue it is stored on");
  for (const w of hj.filter((x) => x.l)) {
    const under = items.filter((li) => li.includes(w.l.replace(/&/g, "&amp;")));
    eq(under.length, 1, `${w.i}'s line is printed under one issue only`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a mapped issue with no stored line is listed bare");
// ═════════════════════════════════════════════════════════════════════════════
{
  const bare = Object.values(DOCS).find((d) => (d.m || []).some((x) => !x.l) && (d.m || []).some((x) => x.l));
  must(bare, "a document mixes issues with and without a stored line");
  const want = expected(bare.s, bare.n);
  const seam = seamOf(await serve(EDGE, pathOf(bare)));
  for (const p of problems(seam, want)) ok(false, `${bare.n}: ${p}`);
  const noLine = want.filter((w) => !w.l);
  must(noLine.length, `${bare.n} has an issue with no stored line in the stores`);
  for (const w of noLine) {
    const li = itemsOf(seam).find((x) => x.includes(`>${w.i.replace(/&/g, "&amp;")}<`)) || "";
    ok(li, `${bare.n}: ${w.i} is listed though it has no stored line`);
    ok(!/pdx-bill-iss-l/.test(li), `${bare.n}: a sentence was written under ${w.i}, which has no stored line`);
    eq(plain(li), w.i, `${bare.n}: ${w.i}'s entry is its label and nothing else`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing mapped, nothing said; an unknown number has no list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const none = Object.values(DOCS).find((d) => !d.m && expected(d.s, d.n).length === 0);
  must(none, "a published measure mapped to nothing exists");
  const seam = seamOf(await serve(EDGE, pathOf(none)));
  ok(/data-pdx-bill-held="doc"/.test(seam), `${none.n} is a held document`);
  ok(!/pdx-bill-issues|data-pdx-bill-issue/.test(seam), `${none.n}, mapped to nothing, carries an issue list`);
  ok(!/touch(?:es)? (?:no|none)|no issues?|not mapped|unmapped/i.test(plain(seam)), `${none.n} says it touches none`);
  ok(!/Every topic this act touches/.test(seam), `${none.n} carries the heading with no list`);
}
for (const p of ["/b/119/H.R.%20999999", "/b/999/H.J.Res.%20131"]) {
  stubFetch(404);
  const seam = seamOf(await serve(EDGE, p));
  ok(/data-pdx-bill-empty="1"/.test(seam), `${p} is the empty`);
  ok(!/pdx-bill-issues|data-pdx-bill-issue|pdx-bill-iss-/.test(seam), `${p}: the empty carries an issue list`);
  for (const w of hj) ok(!seam.includes(w.i.replace(/&/g, "&amp;")), `${p}: the empty names ${w.i}`);
}
stubFetch("throw");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the snapshot is the stores, corrections honoured");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(INDEX.stats.unresolvedCorrections.length, 0, "every mapping correction in the migrations was replayed");
  let drift = 0;
  for (const d of Object.values(DOCS)) {
    const want = expected(d.s, d.n).map((w) => (w.l ? { i: w.i, l: w.l } : { i: w.i }));
    if (JSON.stringify(d.m || []) !== JSON.stringify(want)) { drift++; if (drift <= 3) ok(false, `${d.s}|${d.n}: db/bill-docs.json's issue list is not the stores'`); }
  }
  eq(drift, 0, "every document's issue list is the projection's issues with each pair's own line");
  // A filing a later migration withdrew is not printed.
  const hr1526 = DOCS["119|H.R. 1526"];
  must(hr1526, "H.R. 1526 is a document");
  const names = (hr1526.m || []).map((x) => x.i);
  ok(!names.includes(stripEmoji(LABELS.gov_balance)), "H.R. 1526 is still filed under gov_balance, which 20260725010000 withdrew");
  ok(names.includes(stripEmoji(LABELS.judicial_check)), "H.R. 1526 is filed under judicial_check, where 20260904000000 moved it");
  const pn = DOCS["119|PN11-7"];
  if (pn) ok(!(pn.m || []).some((x) => x.i === "defense"), "PN11-7 prints the retired 'defense' key");
  // ISSUE_MAP and the share index agree on every label both carry.
  const si = JSON.parse(R("db/share-index.json")).issues || {};
  for (const k of Object.keys(si)) if (LABELS[k] !== si[k]) ok(false, `${k}: issue-map.js and db/share-index.json carry different labels`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const LABEL_SPAN = "`<li data-pdx-bill-issue><span class=\"pdx-bill-iss-i\">${text(x.issue)}</span>` +";
  const LINE_SPAN = "(x.line ? ` <span class=\"pdx-bill-iss-l\">${text(x.line)}</span>` : \"\") +";
  must(EDGE_SRC.includes(LABEL_SPAN) && EDGE_SRC.includes(LINE_SPAN), "share-preview.ts renders the issue entry in the shape the mutations rewrite");
  const muts = [
    ["prints a score", EDGE_SRC.replace(LABEL_SPAN, "`<li data-pdx-bill-issue><span class=\"pdx-bill-iss-i\">${text(x.issue)}</span> 80% score` +")],
    ["prints for/against", EDGE_SRC.replace(LABEL_SPAN, "`<li data-pdx-bill-issue><span class=\"pdx-bill-iss-i\">${text(x.issue)}</span> · for` +")],
    ["prints against inside the line", EDGE_SRC.replace(LINE_SPAN, "(x.line ? ` <span class=\"pdx-bill-iss-l\">Against: ${text(x.line)}</span>` : \"\") +")],
    ["prints primary", EDGE_SRC.replace(LABEL_SPAN, "`<li data-pdx-bill-issue><span class=\"pdx-bill-iss-i\">${text(x.issue)} (primary)</span>` +")],
    ["prints another issue's line under this one", EDGE_SRC.replace("d.issues.map((x) =>", "d.issues.map((x, j, all) => (x = { ...x, line: all[(j + 1) % all.length].line || x.line }, x)).map((x) =>")],
    ["invents a sentence under a bare issue", EDGE_SRC.replace(LINE_SPAN, "` <span class=\"pdx-bill-iss-l\">${text(x.line || \"Affects this issue.\")}</span>` +")],
    ["drops an issue with no line", EDGE_SRC.replace("d.issues.map((x) =>", "d.issues.filter((x) => x.line).map((x) =>")],
  ];
  const bare = Object.values(DOCS).find((d) => (d.m || []).some((x) => !x.l) && (d.m || []).some((x) => x.l));
  for (const [name, src] of muts) {
    ok(src !== EDGE_SRC, `mutation "${name}" applied to share-preview.ts`);
    const edge = await edgeFrom(src);
    const caught =
      problems(seamOf(await serve(edge, ACCEPT)), hj).length > 0 ||
      problems(seamOf(await serve(edge, pathOf(bare))), expected(bare.s, bare.n)).length > 0;
    ok(caught, `mutation "${name}" was not caught`);
  }
}
globalThis.fetch = realFetch;

if (failures.length) {
  console.error(`\n✗ bill issues: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ bill issues: every /b/ document names the issues its measure is mapped to — ${passed} assertions passed`);
