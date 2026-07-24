#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Render tests for the H.R.1 Showcase (hr1-showcase.js)
// ─────────────────────────────────────────────────────────────────────────────
// The showcase is a browser IIFE that rebuilds its host's innerHTML on every
// mount. Its "other multi-issue measures" block is fed by a LIVE fetch of
// GET /api/voting-record/measures, so the thing most worth gating is that the
// block is genuinely self-gating: it must render nothing when the API is down,
// nothing when the only multi-issue measure in the data is H.R.1 itself, and it
// must never list a single-issue measure or one with no recorded votes.
//
//   node scripts/test-hr1-showcase.mjs
//
// Runs the module in a node:vm sandbox against a minimal fake DOM and a stubbed
// fetch. No network, no database, no browser. Non-zero exit on any failure.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "hr1-showcase.js"), "utf8");

function makeCtx(measuresPayload) {
  const host = {
    id: "hr1-showcase", hidden: true, innerHTML: "",
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    getAttribute: () => null, classList: { toggle() {} },
  };
  const ctx = {
    console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    Promise, String, Array, Object, RegExp, parseInt, isNaN,
    document: {
      readyState: "complete", head: { appendChild() {} }, body: {},
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      getElementById: (id) => (id === "hr1-showcase" ? host : null),
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    fetch: (url) => {
      ctx.__fetched = url;
      if (!measuresPayload) return Promise.reject(new Error("network down"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(measuresPayload) });
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.__host = host;
  return ctx;
}

const PAYLOAD = {
  items: [
    { id: 1, number: "H.R. 1", chamber: "house", title: "One Big Beautiful Bill Act",
      issueKeys: ["lower_taxes", "healthcare"], isOmnibus: true, rollcallCount: 1, voteCount: 430,
      source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1", label: "Congress.gov" } },
    { id: 2, number: "H.R. 4758", chamber: "house", title: "Some Multi-Issue Act", shortTitle: "Multi-Issue Act",
      issueKeys: ["gov_transparency", "border_security"], isOmnibus: true, rollcallCount: 2, voteCount: 111,
      source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/4758", label: "Congress.gov" } },
    { id: 3, number: "H.R. 6644", chamber: "house", title: "Single Issue Act",
      issueKeys: ["lower_taxes"], isOmnibus: false, rollcallCount: 1, voteCount: 400,
      source: { url: "https://example.gov/x", label: "Congress.gov" } },
    { id: 4, number: "S. 99", chamber: "senate", title: "Unvoted Multi Act",
      issueKeys: ["healthcare", "national_debt"], isOmnibus: true, rollcallCount: 0, voteCount: 0,
      source: { url: "https://example.gov/y", label: "Congress.gov" } },
  ],
};

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// ── Case A: API returns data → block renders, H.R.1 excluded, singles excluded ──
{
  const ctx = makeCtx(PAYLOAD);
  vm.runInContext(SRC, vm.createContext(ctx), { filename: "hr1-showcase.js" });
  ctx.window.PDXHR1.mount();
  const first = ctx.__host.innerHTML;
  ok(first.includes("6 issues scored separately"), "A: diagram caption names the issue count");
  ok((first.match(/hr1-out /g) || []).length >= 3, "A: diagram shows three fan-out outcomes");
  ok(first.includes("Food aid (SNAP) tightened"), "A: SNAP card still present");
  ok(!first.includes("Not a one-off"), "A: live block absent before fetch resolves");
  await new Promise((r) => setTimeout(r, 20));
  const html = ctx.__host.innerHTML;
  ok(String(ctx.__fetched).includes("/api/voting-record/measures"), "A: hit the measures endpoint");
  ok(html.includes("Not a one-off"), "A: live block rendered after fetch");
  ok(html.includes("H.R. 4758"), "A: multi-issue voted measure listed");
  ok(!html.includes("H.R. 6644"), "A: single-issue measure excluded");
  ok(!html.includes("S. 99"), "A: multi-issue with no recorded votes excluded");
  ok((html.match(/hr1-more-card/g) || []).length === 1, "A: H.R.1 itself excluded from its own list");
  ok(html.includes("#Gov transparency"), "A: unknown issue key prettified, not raw");
  ok(html.includes("#Border security"), "A: curated label used where available");
  ok(html.includes("2 issues"), "A: per-measure issue count shown");
  ok(html.includes("111 recorded votes"), "A: vote counts shown");
  ok(html.includes("How multi-issue votes are scored"), "A: methodology cross-link in footer");
}

// ── Case B: API fails → nothing extra renders, showcase still stands ────────────
{
  const ctx = makeCtx(null);
  vm.runInContext(SRC, vm.createContext(ctx), { filename: "hr1-showcase.js" });
  ctx.window.PDXHR1.mount();
  await new Promise((r) => setTimeout(r, 20));
  const html = ctx.__host.innerHTML;
  ok(!html.includes("Not a one-off"), "B: fetch failure renders no live block");
  ok(html.includes("What’s actually inside the one vote"), "B: curated story unaffected");
  ok(ctx.__host.hidden === false, "B: section still revealed");
}

// ── Case C: API returns only H.R.1 → still no block (no false 'others') ─────────
{
  const ctx = makeCtx({ items: [PAYLOAD.items[0]] });
  vm.runInContext(SRC, vm.createContext(ctx), { filename: "hr1-showcase.js" });
  ctx.window.PDXHR1.mount();
  await new Promise((r) => setTimeout(r, 20));
  ok(!ctx.__host.innerHTML.includes("Not a one-off"), "C: H.R.1-only data → no secondary block");
}

// ── Case D: with the education layer loaded, terms appear (and only then) ──────
// Cross-module check: hr1-showcase.js calls PDXLearn through guarded helpers, so
// cases A–C above already prove it renders fine WITHOUT the education layer. This
// proves the hooks actually fire WITH it.
{
  const ctx = makeCtx(PAYLOAD);
  const sandbox = vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "pdx-learn.js"), "utf8"), sandbox, { filename: "pdx-learn.js" });
  vm.runInContext(SRC, sandbox, { filename: "hr1-showcase.js" });
  ok(!!ctx.window.PDXLearn, "D: PDXLearn loaded into the sandbox");
  ctx.window.PDXHR1.mount();
  await new Promise((r) => setTimeout(r, 20));
  const html = ctx.__host.innerHTML;
  ok(html.includes('data-pdxl-sheet="omnibus"'), "D: the omnibus how-to pill is offered");
  ok(html.includes('data-pdx-term="hr"'), "D: H.R. in the lead is a defined term");
  ok(html.includes('data-pdx-term="reconciliation"'), "D: reconciliation in the lead is a defined term");
  // The live cross-link cards teach their own measure prefixes.
  ok(html.includes('class="hr1-more-num"'), "D: live cards still render");
  ok((html.match(/data-pdx-term="hr"/g) || []).length >= 2,
    "D: the measure number on a live card links its prefix too");
  ok(html.includes("</button> 4758"), "D: only the prefix becomes a term — the number stays text");
}

if (fails.length) { console.error("✗\n  " + fails.join("\n  ")); process.exit(1); }
console.log("✓ hr1-showcase: all assertions passed (4 cases)");
