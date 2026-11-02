#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-hero-election-day.mjs — the hero's one Election Day line
// ─────────────────────────────────────────────────────────────────────────────
// One line above the record carousel names Election Day and points at the
// first step: seeing who already holds power over you. What this pins:
//
//   1. The line is in the hero, above the carousel, and names the date.
//   2. It is text, not a second competing button; the primary control is still
//      the Path A button that opens the location finder.
//   3. The District Voice card is unchanged and still links to /voice.
//   4. No new /district/* routes; the worker moved a version.
//
//   node scripts/test-hero-election-day.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const must = (c, m) => { if (!c) { console.error(`FATAL: ${m}`); process.exit(1); } };

const INDEX = R("index.html");
const heroAt = INDEX.indexOf('<section id="hero"');
must(heroAt > 0, "index.html no longer opens a #hero section");
const heroEnd = INDEX.indexOf("</section>", heroAt);
const HERO = INDEX.slice(heroAt, heroEnd);

const a = HERO.indexOf("<!-- pdx:hero-election-day:begin -->");
const b = HERO.indexOf("<!-- pdx:hero-election-day:end -->");
must(a > 0 && b > a, "the Election Day line's markers are missing from the hero");
const LINE = HERO.slice(a, b);

// ── 1. In the hero, above the carousel, names the date ──────────────────────
ok(LINE.includes('id="hero-election-day"'), "the line carries its id");
ok(/Election Day is <span[^>]*>tomorrow<\/span> — Tuesday, November 3\./.test(LINE),
  "the line says Election Day is tomorrow, Tuesday, November 3");
ok(/who already holds power over you/.test(LINE), "the line names the first step");
ok(a < HERO.indexOf('<div id="hero-showcase"'), "the line sits above the record carousel");
ok(a > HERO.indexOf("</h1>"), "the line sits below the headline");

// ── 2. Not a button; the primary control is unchanged ───────────────────────
ok(!/<button|<a\s/.test(LINE), "the line adds no button or link of its own");
const ctaCount = (HERO.match(/data-pdx-firstrun-cta=/g) || []).length;
ok(ctaCount === 2, `the hero still has exactly the two ranked doors (found ${ctaCount})`);
const btn = (HERO.match(/<button[^>]*id="hero-first-run"[^>]*>/) || [""])[0];
ok(btn.includes('data-pdx-firstrun-cta="A"'), "the primary button is still Path A");
ok(/PDXFirstRun\.pathA\(\)/.test(btn) && /pdxFindMyReps\(\)/.test(btn) && /who-represents-me/.test(btn),
  "the primary button still runs Path A, falling back to the finder");
ok(HERO.indexOf('id="hero-first-run"') < HERO.indexOf('id="hero-path-b"'),
  "the location button is still first");

// The date script: tomorrow today, today on the day, gone after.
{
  const src = (LINE.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  must(src, "the line's inline script is missing");
  const run = (iso) => {
    const when = { textContent: "tomorrow" };
    const el = { removed: false, remove() { this.removed = true; }, querySelector: () => when };
    const RealDate = Date;
    const ctx = {
      document: { getElementById: (id) => (id === "hero-election-day" ? el : null) },
      Date: class extends RealDate { constructor() { super(iso); } },
    };
    vm.runInNewContext(src, ctx);
    return { removed: el.removed, text: when.textContent };
  };
  const nov2 = run("2026-11-02T12:00:00");
  ok(!nov2.removed && nov2.text === "tomorrow", "on November 2 the line reads tomorrow");
  const nov3 = run("2026-11-03T12:00:00");
  ok(!nov3.removed && nov3.text === "today", "on November 3 the line reads today");
  const nov4 = run("2026-11-04T08:00:00");
  ok(nov4.removed, "after November 3 the line is removed");
}

// ── 3. The District Voice card is unchanged ─────────────────────────────────
{
  const g0 = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
  const g1 = INDEX.indexOf("<!-- pdx:home-voice-gate:end -->", g0);
  must(g0 > 0 && g1 > g0, "the District Voice card's markers are missing");
  const GATE = INDEX.slice(g0, g1);
  ok(/href="\/voice"/.test(GATE), "the District Voice card still links to /voice");
  ok(!GATE.includes("hero-election-day") && !/Election Day/.test(GATE),
    "the District Voice card does not carry the new line");
  ok(g0 > a + heroAt, "the District Voice card is still below the carousel and the new line");
  let base = null;
  try { base = execSync("git show HEAD:index.html", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch {}
  if (base) {
    const h0 = base.indexOf("<!-- pdx:home-voice-gate:begin -->");
    const h1 = base.indexOf("<!-- pdx:home-voice-gate:end -->", h0);
    if (h0 > 0 && h1 > h0) ok(base.slice(h0, h1) === GATE, "the District Voice card is byte-identical to HEAD");
  }
}

// ── 4. No new /district/* routes, and the worker moved ──────────────────────
ok(!/\/district\//.test(LINE), "the line names no /district/* address");
{
  let base = null;
  try { base = execSync("git ls-tree --name-only HEAD", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch {}
  if (base) {
    const before = new Set(base.split("\n").filter((f) => /^district-.*\.html$/.test(f)));
    const now = readdirSync(ROOT).filter((f) => /^district-.*\.html$/.test(f));
    const added = now.filter((f) => !before.has(f));
    ok(added.length === 0, `no new district pages (added: ${added.join(", ")})`);
    let toml0 = null;
    try { toml0 = execSync("git show HEAD:netlify.toml", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch {}
    if (toml0) {
      const routes = (t) => (t.match(/\/district\/[\w*:-]+/g) || []).length;
      ok(routes(R("netlify.toml")) === routes(toml0), "netlify.toml carries no new /district/* routes");
    }
  }
}
{
  const SW = R("sw.js");
  ok(/const CACHE_VERSION = 'v495';/.test(SW), "the service worker moved to v495");
  ok(/v495 - ELECTION DAY/.test(SW), "the bump is documented");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.error(`  ✗ ${f}`); process.exit(1); }
