#!/usr/bin/env node
/**
 * test-sunlight-subtags.mjs — Sunlight Banking, Sunlight Concrete and the
 * Market-Power Test
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. TWO SUB-TAGS UNDER SUNLIGHT GOVERNANCE. sunlight-governance.js publishes
 *      PDXSunlight.SUB_TAGS with sunlight_banking and sunlight_concrete, each
 *      parented to sunlight_governance. subTag() applies the parent too;
 *      untag() removes both. The parent tag itself is unchanged.
 *   2. THE MARKET-POWER TEST IS ONE REUSABLE BLOCK. Three questions (choice,
 *      concentration, public backing); marketPowerTestHTML() renders them for
 *      any page, and the stubs' static markup matches the module word for word.
 *   3. THE STUBS RENDER. sunlight-banking.html and sunlight-concrete.html
 *      exist, are served by pretty URLs (no new netlify.toml rewrite), state a
 *      one-sentence goal, list a minimum viable ledger, give Utah starting
 *      moves, point only at public https sources, carry the test and link the
 *      Rocky Mountain Power page as the live example.
 *   4. THE HOME LISTS BOTH. /sunlight links each stub.
 *   5. NOTHING ELSE MOVED. No redirect, no service-worker precache entry, no
 *      database migration names the new pages.
 *
 *   node scripts/test-sunlight-subtags.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`   ── ${t}`);
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const w = {};
w.window = w;
vm.runInContext(R("sunlight-governance.js"), vm.createContext(w), { filename: "sunlight-governance.js" });
const S = w.PDXSunlight;

const STUBS = [
  { key: "sunlight_banking", label: "Sunlight Banking", file: "sunlight-banking.html", href: "/sunlight-banking" },
  { key: "sunlight_concrete", label: "Sunlight Concrete", file: "sunlight-concrete.html", href: "/sunlight-concrete" },
];

// ═════════════════════════════════════════════════════════════════════════════
section("two sub-tags sit under Sunlight Governance");
{
  eq(S.TAG.key, "sunlight_governance", "the parent tag key moved");
  eq(S.SUB_TAGS.length, 2, "sub-tag count");
  for (const st of STUBS) {
    const t = S.subTagOf(st.key);
    ok(t, `sub-tag ${st.key} is missing`);
    if (!t) continue;
    eq(t.label, st.label, `${st.key} label`);
    eq(t.parent, "sunlight_governance", `${st.key} parent`);
    eq(t.href, st.href, `${st.key} href`);
  }
  const item = { kind: "issue", id: "x", title: "Deposit share in Salt Lake County" };
  S.subTag(item, "sunlight_banking");
  ok(S.isTagged(item), "subTag() did not apply the parent tag");
  ok(item.tags.includes("sunlight_banking"), "subTag() did not apply the sub-tag");
  eq(S.subTagsOf(item).map((t) => t.key).join(","), "sunlight_banking", "subTagsOf()");
  S.subTag(item, "sunlight_banking");
  eq(item.tags.length, 2, "subTag() applied a tag twice");
  S.untag(item);
  eq(item.tags.length, 0, "untag() left a sub-tag behind");
  let threw = false;
  try { S.subTag({}, "sunlight_nope"); } catch (e) { threw = true; }
  ok(threw, "subTag() accepted an unknown sub-tag");
  ok(S.search("sunlight banking") && S.search("sunlight concrete"), "the sub-tag names do not open the Sunlight thread");
  ok(!S.search("housing"), "an unrelated query opened the Sunlight thread");
}

// ═════════════════════════════════════════════════════════════════════════════
section("the Market-Power Test is one reusable three-question block");
const T = S.MARKET_POWER_TEST;
{
  eq(T.title, "Market-Power Test", "test title");
  eq(T.questions.map((q) => q.key).join(","), "choice,concentration,public_backing", "test questions");
  const h = S.marketPowerTestHTML("Anything");
  ok(/data-sunlight-mpt/.test(h), "the rendered block has no marker");
  eq((h.match(/<li data-mpt-q=/g) || []).length, 3, "rendered question count");
  ok(h.includes("Market-Power Test: Anything"), "the rendered block does not name its subject");
  ok(!/<script/i.test(S.marketPowerTestHTML("<script>x</script>")), "the subject is not escaped");
}

// ═════════════════════════════════════════════════════════════════════════════
section("the Banking and Concrete stubs render");
const toml = R("netlify.toml");
for (const st of STUBS) {
  ok(existsSync(join(ROOT, st.file)), `${st.file} is missing`);
  if (!existsSync(join(ROOT, st.file))) continue;
  const html = R(st.file);
  const main = (new RegExp(`<main[^>]*data-sunlight-subtag="${st.key}"[^>]*>([\\s\\S]*?)</main>`).exec(html) || [])[1] || "";
  ok(main, `${st.file} has no sub-tag main`);
  ok(html.includes(`<link rel="canonical" href="https://politidex.fyi${st.href}" />`), `${st.file} canonical`);
  ok(new RegExp(`<h1[^>]*>${st.label}</h1>`).test(main), `${st.file} heading`);
  ok(main.includes('data-sunlight-tag="sunlight_governance"') && main.includes(`data-sunlight-tag="${st.key}"`), `${st.file} does not carry both tags`);
  ok(/data-sg-stub/.test(main), `${st.file} is not marked as a stub`);

  const goal = /<p class="sg-summary" id="sg-goal" data-sg-goal>([\s\S]*?)<\/p>/.exec(main);
  ok(goal && strip(goal[1]).split(/(?<=[.!?])\s+/).filter(Boolean).length === 1, `${st.file} goal is not one sentence`);

  const mvl = /<ul[^>]*data-sg-mvl>([\s\S]*?)<\/ul>/.exec(main);
  ok(mvl && (mvl[1].match(/<li /g) || []).length >= 3, `${st.file} has no minimum viable ledger`);
  const moves = /<ol[^>]*data-sg-moves>([\s\S]*?)<\/ol>/.exec(main);
  ok(moves && (moves[1].match(/<li /g) || []).length >= 2, `${st.file} has no Utah starting moves`);
  ok(moves && /Utah|UDOT/.test(moves[1]), `${st.file} starting moves do not name Utah`);

  const src = /<ul[^>]*data-sg-sources>([\s\S]*?)<\/ul>/.exec(main);
  const links = src ? [...src[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]) : [];
  ok(links.length >= 3, `${st.file} lists fewer than three public sources`);
  ok(links.every((u) => /^https:\/\/[^/]*\.(gov|org)\//.test(u) || /^https:\/\/(banks\.data\.fdic|cdr\.ffiec|ffiec\.cfpb)\.gov\//.test(u)),
    `${st.file} points at a non-public source: ${links.join(" ")}`);

  // The test block matches the module word for word.
  const mpt = /<section[^>]*data-sunlight-mpt[^>]*>([\s\S]*?)<\/section>/.exec(main);
  ok(mpt, `${st.file} has no Market-Power Test`);
  if (mpt) {
    const qs = [...mpt[1].matchAll(/<li data-mpt-q="([a-z_]+)"><b>([^<]+)\.<\/b> ([^<]+)<\/li>/g)];
    eq(qs.length, 3, `${st.file} test question count`);
    T.questions.forEach((q, i) => {
      ok(qs[i] && qs[i][1] === q.key && qs[i][2] === q.label && decode(qs[i][3]) === q.q, `${st.file} question ${q.key} drifted from the module`);
    });
    ok(mpt[1].includes(T.intro) && mpt[1].includes(T.note), `${st.file} test intro/note drifted from the module`);
  }

  ok(/<a[^>]*href="\/sunlight\/rocky-mountain-power"[^>]*data-sg-live-example/.test(main), `${st.file} does not link the RMP live example`);
  ok(/href="\/sunlight"/.test(main), `${st.file} does not link the Sunlight home`);
  ok(!/src="(?!\/|https:)/.test(html) && !/href="(?!\/|https:|#)/.test(html), `${st.file} has a relative path`);
  ok(!/<script/i.test(html.replace(/<!--[\s\S]*?-->/g, "")), `${st.file} ships a script`);
  ok(!/<form|<input|account number|ssn|social security/i.test(html), `${st.file} asks for private data`);

  const text = strip(main);
  ok(!/\b(republican|democrat|conservative|liberal|progressive|corrupt|greed|cartel|gop)\b/i.test(text), `${st.file} carries partisan or loaded language`);
  ok(!/blockchain|crypto|mandate/i.test(text), `${st.file} carries blockchain or mandate wording`);

  ok(!toml.includes(st.href) && !toml.includes(st.file), `netlify.toml gained a route for ${st.href}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("the home lists both sub-tags; nothing else moved");
{
  const home = R("sunlight.html");
  for (const st of STUBS) ok(new RegExp(`data-sh-subtag="${st.key}"[\\s\\S]*?href="${st.href}"`).test(home), `/sunlight does not link ${st.href}`);
  const rmp = R("sunlight-rocky-mountain-power.html");
  ok(!/sunlight-banking|sunlight-concrete|data-sunlight-mpt/.test(rmp), "the RMP page changed");
  const sw = R("sw.js");
  const shell = (/const SHELL_ASSETS = \[([\s\S]*?)\];/.exec(sw) || [])[1] || "";
  ok(!/sunlight-banking|sunlight-concrete/.test(shell), "the stubs were added to the precache");
  const migs = readdirSync(join(ROOT, "netlify/database/migrations"));
  ok(!migs.some((m) => /banking|concrete|market_power/i.test(m)), "a migration was added for the sub-tags");
}

if (failures.length) {
  console.error(`\n✗ sunlight sub-tags: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight sub-tags: ${passed} checks passed`);
