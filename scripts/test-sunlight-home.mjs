#!/usr/bin/env node
/**
 * test-sunlight-home.mjs — Sunlight Governance, the big-picture home
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. /sunlight IS THE BIG-PICTURE HOME. sunlight.html explains the full
 *      public ledger idea in plain language, carries simple visuals (symbols,
 *      a picture example, a bar graph, one before/after comparison), names the
 *      later community-program uses, links the Rocky Mountain Power page as the
 *      first working example and points at its one next step. It stays short
 *      and neutral: no blockchain tutorial, no mandate or equity wording, and
 *      none of the rate-case detail tables.
 *   2. THE ROCKY MOUNTAIN POWER PAGE RESOLVES. The file exists, netlify.toml
 *      rewrites /sunlight/rocky-mountain-power to it, and it still carries the
 *      full rate-case detail and the contract ask. Old /sunlight#rmp-… links
 *      forward there.
 *   3. MENU AND FOOTER. The front page's main menu, mobile menu and footer
 *      each carry a working link to /sunlight.
 *
 *   node scripts/test-sunlight-home.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`   ── ${t}`);
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

const RMP = "/sunlight/rocky-mountain-power";

// ═════════════════════════════════════════════════════════════════════════════
section("/sunlight is a short, visual big-picture home");
{
  const html = R("sunlight.html");
  const main = (/<main[^>]*data-sunlight-home[^>]*>([\s\S]*?)<\/main>/.exec(html) || [])[1] || "";
  ok(main, "sunlight.html has no big-picture home main");
  const text = strip(main);

  ok(/<link rel="canonical" href="https:\/\/politidex\.fyi\/sunlight" \/>/.test(html), "canonical is not /sunlight");
  ok(/<h1[^>]*>Sunlight Governance<\/h1>/.test(main), "no Sunlight Governance heading");

  // The idea, in plain language.
  const idea = /<p class="sh-idea" id="sh-idea" data-sh-idea>([\s\S]*?)<\/p>/.exec(main);
  ok(idea, "the home has no plain-language statement of the idea");
  if (idea) {
    const t = strip(idea[1]);
    ok(/full public ledger/.test(t), "the idea does not name a full public ledger");
    ok(/cost/.test(t) && /profit/.test(t) && /contract/.test(t), "the idea does not name costs, profits and contracts");
    ok(/whole picture/.test(t), "the idea does not say everyone can see the whole picture");
    ok(t.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 3, "the idea is longer than three sentences");
  }

  // Simple visuals: symbols, a picture example, a graph, a before/after.
  const syms = [...main.matchAll(/<li class="sh-sym" data-sh-sym="([a-z]+)">([\s\S]*?)<\/li>/g)];
  ok(syms.length >= 3, "the home has fewer than three ledger symbols");
  for (const [, k, body] of syms) ok(/class="sh-sym-icon" aria-hidden="true"/.test(body), `symbol "${k}" has no icon`);
  ok(/data-sh-picture/.test(main) && /sh-stack-closed/.test(main) && /sh-stack-open/.test(main), "the home has no picture example of a closed vs. open bill");
  ok(/not to scale/.test(text), "the picture example is not marked as illustrative");

  const graph = /<figure class="sh-graph" data-sh-graph>([\s\S]*?)<\/figure>/.exec(main);
  ok(graph, "the home has no graph");
  if (graph) {
    ok(/<svg[^>]*role="img"/.test(graph[1]) && /<desc/.test(graph[1]), "the graph is not an accessible image");
    const bars = [...graph[1].matchAll(/<rect class="bar[^"]*"[^>]*width="([\d.]+)"/g)].map((m) => Number(m[1]));
    ok(bars.length === 3, "the graph does not draw three bars");
    // The bars are to scale with the figures they label.
    if (bars.length === 3) {
      const want = [667.3, 330.2, 87.2].map((v) => (v / 667.3) * bars[0]);
      ok(bars.every((b, i) => Math.abs(b - want[i]) < 0.5), "the graph bars are not to scale");
    }
    for (const v of ["$667.3", "$330.2", "$87.2"]) ok(graph[1].includes(v), `the graph does not label ${v}`);
  }

  const ba = /<div class="sh-ba" data-sh-before-after>([\s\S]*?)<\/div>\s*<p class="sh-small">/.exec(main);
  ok(ba, "the home has no before/after comparison");
  if (ba) {
    ok(/data-sh-side="before"/.test(ba[1]) && /Hidden costs/.test(ba[1]), "the before side is not hidden costs");
    ok(/data-sh-side="after"/.test(ba[1]) && /Full open ledger/.test(ba[1]), "the after side is not the full open ledger");
    ok(ba[1].indexOf('data-sh-side="before"') < ba[1].indexOf('data-sh-side="after"'), "before does not come first");
  }

  // Later uses.
  const later = /<ul class="sh-later" data-sh-later>([\s\S]*?)<\/ul>/.exec(main);
  ok(later, "the home does not note the later community-program uses");
  if (later) {
    const t = strip(later[1]);
    ok(/co-op construction loans/i.test(t), "co-op construction loans are not named");
    ok(/community gardens/i.test(t), "community gardens are not named");
    ok(/pay themselves back/i.test(t), "programs that pay themselves back are not named");
  }
  ok(/participat|takes? part/i.test(text) && /paid back|repay/i.test(text), "the home does not say participation and repayment stay visible");

  // The first working example and its next step.
  ok(new RegExp(`<a class="sh-example" href="${RMP}"`).test(main), "the home does not link the Rocky Mountain Power page");
  ok(/First working example/.test(text), "the link is not framed as the first working example");
  ok(new RegExp(`data-sh-next>[\\s\\S]*href="${RMP}#rmp-ask"`).test(main), "the home's next step does not point at the contract ask");
  ok(/publish one confidential contract/i.test(text), "the next step does not name the contract ask");

  // Short and neutral.
  ok(text.split(/\s+/).length < 600, `the home is not short (${text.split(/\s+/).length} words)`);
  ok(!/blockchain|\bchain\b|ledger technology|token|crypto/i.test(text), "the home carries blockchain wording");
  ok(!/mandate|must be required|should be required|require by law/i.test(text), "the home carries mandate language");
  ok(!/equity|equitable/i.test(text), "the home carries equity wording");
  ok(!/\b(republican|democrat|conservative|liberal|progressive|left-wing|right-wing|corrupt|greed|gop)\b/i.test(text), "the home carries partisan language");
  // The rate-case detail is not on the home any more.
  ok(!/id="rmp-24-035-04"|data-sg-compare|data-sg-decided|data-sg-conf/.test(html), "the rate-case detail is still on the home");
  // Old anchors forward to the new page.
  ok(/\/\^#rmp-\/\.test\(h\)\) location\.replace\('\/sunlight\/rocky-mountain-power'/.test(html), "old /sunlight#rmp-… links are not forwarded");
}

// ═════════════════════════════════════════════════════════════════════════════
section("/sunlight/rocky-mountain-power resolves and keeps the rate-case detail and the ask");
{
  ok(existsSync(join(ROOT, "sunlight-rocky-mountain-power.html")), "sunlight-rocky-mountain-power.html is missing");
  const toml = R("netlify.toml");
  for (const from of [RMP, `${RMP}/`, `${RMP}.html`]) {
    ok(new RegExp(`from = "${from.replace(/[./]/g, "\\$&")}"\\s+to = "/sunlight-rocky-mountain-power\\.html"\\s+status = 200`).test(toml), `netlify.toml does not rewrite ${from}`);
  }
  const html = R("sunlight-rocky-mountain-power.html");
  ok(/<article[^>]*id="rmp-24-035-04"/.test(html), "no rate-case article");
  for (const mark of ["data-sg-steps", "data-sg-figures", "data-sg-decided", "data-sg-conf", "data-sg-compare", "data-sg-ocs", "data-sg-filed-ordered", "data-sg-filings", "data-sg-votes", 'id="rmp-ask"']) {
    ok(html.includes(mark), `the rate-case page lost ${mark}`);
  }
  ok(/Docket No\. 24-035-04/.test(html), "the docket number is missing");
  ok(/The ask: Publish one confidential contract\./.test(html), "the contract ask is missing");
  ok(/<script src="\/sunlight-entries\.js" defer><\/script>/.test(html), "the page does not load the entry");
  ok(!/src="(?!\/|https:)/.test(html) && !/href="(?!\/|https:|#)/.test(html), "a same-origin path in the page is not root-absolute");
}

// ═════════════════════════════════════════════════════════════════════════════
section("the main menu, the mobile menu and the footer link /sunlight");
{
  const idx = R("index.html");
  ok(/<a href="\/sunlight" role="menuitem" class="pdx-navmenu__item"[^>]*>[\s\S]*?Sunlight Governance<\/span><\/a>/.test(idx), "the main menu has no /sunlight row");
  ok(/<a href="\/sunlight"[^>]*>☀️ Sunlight Governance<\/a>/.test(idx), "the mobile menu has no /sunlight row");
  const footer = (/<footer[\s\S]*?<\/footer>/.exec(idx) || [""])[0];
  ok(/<a href="\/sunlight"[^>]*>Sunlight Governance<\/a>/.test(footer), "the footer has no /sunlight link");
  ok(!/href="\/sunlight\/rocky-mountain-power"/.test(idx), "the front page links the Rocky Mountain Power page directly");
  ok(existsSync(join(ROOT, "sunlight.html")), "/sunlight does not resolve to a document");
}

if (failures.length) {
  console.error(`\n✗ sunlight home: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight home: ${passed} checks passed`);
