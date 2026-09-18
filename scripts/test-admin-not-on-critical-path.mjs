#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-admin-not-on-critical-path.mjs — a reader does not download the admin tool
// ─────────────────────────────────────────────────────────────────────────────
// index.html used to load two admin controllers as plain parser-blocking scripts,
// at a fixed position in the document, on every single visit:
//
//   /admin-politician-manager.js   ~191 KB
//   /expansion-controller.js      ~260 KB
//
// Together that is ~451 KB of JavaScript fetched, parsed and compiled by every
// visitor in order to drive two <section>s that are display:none for everyone
// whose email is not one hardcoded address. Nothing a reader can see depends on
// a byte of it. The admin gate now injects both, in their original order, the
// first time an admin is actually recognized.
//
// AND THE GATE IS NOT ON index.html ANY MORE. The sections it drives moved to
// admin.html, served at /admin, so this file's probes moved with them: the gate
// is read out of that document, and index.html is now checked for the OPPOSITE —
// that it declares no ADMIN_EMAILS at all. The critical-path claim in section 1
// got wider rather than narrower in the process: it used to ask one document
// whether it loads 451 KB of admin JS, and it now asks every shipped shell,
// including admin.html itself, where the gate still has to be what fetches it.
//
// One piece of that pair was never admin-only: the data-hygiene layer behind
// window._cleanProfiles(), which the PUBLIC directory and dashboard counts read
// through. It lived inside expansion-controller.js for historical reasons, so
// gating that file would have quietly put duplicate people and stub records back
// on the public roster. It was lifted into /data-hygiene.js and stays on the
// critical path.
//
// What must stay true:
//
//   1. NO SYNC TAG. Neither controller is referenced by a script tag, preload,
//      prefetch or modulepreload in index.html.
//   2. THE GATE OWNS THE FETCH. Both are injected from inside the admin gate,
//      once, only on the allowed branch, and sequentially (expansion-controller
//      reads helpers the politician manager defines).
//   3. THE FILES STILL WORK. Both still exist and still parse — gating a module
//      is not a licence to let it rot.
//   4. THE PUBLIC LAYER STAYED PUBLIC. data-hygiene.js is on the critical path,
//      owns _cleanProfiles, and the admin module no longer defines it.
//   5. NO UNGUARDED REACH. Nothing outside the gated sections calls an
//      admin-only global without a typeof guard, because for a reader those
//      globals now simply do not exist.
//
//   node scripts/test-admin-not-on-critical-path.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
// A harness whose probe target was renamed away is stale, not passing.
const must = (c, m) => { if (c) return; console.error(`✗ admin critical path: STALE HARNESS — ${m}`); process.exit(2); };

const ADMIN = ["admin-politician-manager.js", "expansion-controller.js"];
const INDEX = R("index.html");
const HTML = INDEX.replace(/<!--[\s\S]*?-->/g, "");
// The curator's room. Its gate is the one that fetches the pair now, and its
// own markup is the one place either <section> exists.
const ADMIN_DOC = R("admin.html");
const ADMIN_HTML = ADMIN_DOC.replace(/<!--[\s\S]*?-->/g, "");
// Every document this repo ships, so the "no sync tag" claim is about the site
// rather than about one file. Read from disk and comment-stripped, because a
// commented-out script tag is not a download.
const SHELLS = readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"))
  .map((f) => [f, R(f).replace(/<!--[\s\S]*?-->/g, "")]);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · neither controller is on the critical path");
// ═════════════════════════════════════════════════════════════════════════════
{
  // EVERY SHELL, NOT JUST THE FRONT PAGE. admin.html is the interesting one: it
  // is the document that legitimately drives these two files, and a tag there
  // would hand 451 KB to anyone who merely guesses the address, before the
  // allow-list has said a word.
  must(SHELLS.length >= 10, `the shell sweep sees the repo (${SHELLS.length} documents)`);
  must(SHELLS.some(([f]) => f === "admin.html"), "admin.html is not on disk — the curator's room moved or was renamed");
  for (const f of ADMIN) {
    const esc = f.replace(/\./g, "\\.");
    for (const [doc, src] of SHELLS) {
      ok(!new RegExp(`<script[^>]*src\\s*=\\s*["'][^"']*${esc}`).test(src),
        `${doc} has a <script src> for ${f} — 451 KB of admin JS on a document load`);
      ok(!new RegExp(`<link[^>]*(preload|prefetch|modulepreload)[\\s\\S]{0,200}?${esc}`).test(src),
        `${doc} preloads/prefetches ${f} — a warmed cache entry is still a download`);
    }
  }
  // The size claim in the retirement note is load-bearing, so keep it true-ish:
  // if these files ever shrink to nothing, the note should stop bragging.
  const bytes = ADMIN.reduce((n, f) => n + R(f).length, 0);
  ok(bytes > 300_000, `the gated pair is still substantial (${Math.round(bytes / 1024)} KB) — worth gating`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the admin gate is what fetches them");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ONE OWNER OF THE ALLOW-LIST, AND IT IS NOT THE FRONT PAGE. This is the half
  // of the /admin split that a test can state outright: the string that decides
  // who a curator is appears on admin.html and on no other document. When it was
  // on index.html, drawing a gated nav link required the front page to hold an
  // opinion about it; now the front page has none.
  ok(!INDEX.includes("ADMIN_EMAILS"),
    "index.html declares ADMIN_EMAILS again — the front page is deciding who an admin is");
  for (const [doc, src] of SHELLS) {
    if (doc === "admin.html") continue;
    ok(!src.includes("ADMIN_EMAILS"), `${doc} carries a second copy of the admin allow-list`);
  }

  // The gate is one inline IIFE. Pull it out by its own landmarks rather than by
  // line number so an edit above it cannot silently move the probe.
  const start = ADMIN_DOC.indexOf("var ADMIN_EMAILS");
  must(start > 0, "admin.html no longer declares ADMIN_EMAILS — the admin gate moved or was renamed");
  const gate = ADMIN_DOC.slice(start, ADMIN_DOC.indexOf("</script>", start));

  for (const f of ADMIN) has(gate, f, `the gate injects ${f}`);
  has(gate, "adminModulesRequested", "the injection is once-only, not per auth event");
  has(gate, "el.async = false", "the two modules load in order, not whichever wins the race");
  has(gate, "el.onerror", "a failed admin fetch does not strand the rest of the chain");

  // …and only on the allowed branch. The call must sit inside `if (allowed`.
  const call = gate.indexOf("loadAdminModules(");
  must(call > 0, "the gate no longer calls loadAdminModules()");
  const allowedBranch = gate.lastIndexOf("if (allowed", call);
  ok(allowedBranch > 0 && allowedBranch < call,
    "loadAdminModules() is not inside the `if (allowed)` branch — every visitor would fetch it");

  // Firebase auth resolves after the document, so the list has to be repainted
  // once the modules actually execute.
  ok(/loadAdminModules\(function \(\) \{[\s\S]{0,200}pmRenderList/.test(gate),
    "nothing repaints the manager list after the modules load, so the first admin view is blank");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the gated modules still exist and still parse");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ADMIN) {
    ok(existsSync(join(ROOT, f)), `${f} still ships`);
    // These are classic browser scripts; package.json says "type": "module", so
    // `node --check` would misread them. vm.Script is the same parser without
    // the module assumption.
    let parsed = true;
    try { new vm.Script(R(f), { filename: f }); } catch (e) { parsed = false; failures.push(`${f} no longer parses — ${e.message}`); }
    if (parsed) passed++;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the public data-hygiene layer stayed public");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(existsSync(join(ROOT, "data-hygiene.js")), "data-hygiene.js exists");
  ok(/<script[^>]*src\s*=\s*["']\/data-hygiene\.js["']/.test(HTML),
    "index.html loads /data-hygiene.js synchronously — the public directory reads through it");
  // IT DID NOT GO WITH THE TOOLS, AND IT DID NOT GET COPIED EITHER. The
  // curator's room needs the same cleaned view the public directory needs, so
  // admin.html links the same root-absolute file rather than either document
  // owning a private copy of the de-duplication rules.
  ok(/<script[^>]*src\s*=\s*["']\/data-hygiene\.js["']/.test(ADMIN_HTML),
    "admin.html does not load /data-hygiene.js — the tools would de-duplicate against nothing");
  const hy = R("data-hygiene.js");
  has(hy, "window._cleanProfiles = function", "data-hygiene.js owns _cleanProfiles");
  has(hy, "window._dataHygiene", "…and the reported result alongside it");
  // The whole point: the public consumer must be able to find it.
  has(R("profiles-full.js"), "window._cleanProfiles",
    "_populateDirData no longer builds the directory from the cleaned view");
  for (const f of ADMIN) {
    ok(!/window\._cleanProfiles\s*=/.test(R(f)),
      `${f} must not define _cleanProfiles — a gated module cannot own a public helper`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing outside the gate reaches an admin global unguarded");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every global the gated pair defines, minus anything also defined by a module
  // that still loads for everyone (window._showToast, for instance, is a
  // voter-hub-location.js export the admin tools merely consume).
  const defined = new Set();
  for (const f of ADMIN) {
    for (const m of R(f).matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) defined.add(m[1]);
  }
  const SHIPPED = readdirSync(ROOT)
    .filter((f) => f.endsWith(".js") && !f.startsWith("sw") && !f.includes(".min."))
    .filter((f) => !ADMIN.includes(f));
  for (const f of SHIPPED) {
    for (const m of R(f).matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) defined.delete(m[1]);
  }
  const ADMIN_ONLY = [...defined];
  must(ADMIN_ONLY.length > 20, `the sweep found the admin globals (${ADMIN_ONLY.length})`);

  // A reference is safe when a typeof check for the same name sits on it or just
  // above it — that is the pattern the whole codebase already uses to talk across
  // modules, and it is exactly what makes a missing module a no-op.
  const guarded = (lines, i, name) => {
    for (let k = Math.max(0, i - 3); k <= i; k++) {
      if (lines[k].includes("typeof") && lines[k].includes(name)) return true;
      if (new RegExp(`window\\.${name}\\s*&&`).test(lines[k])) return true;
    }
    return false;
  };

  // THE EXCLUSION WINDOW MOVED, AND ON index.html THERE IS NO WINDOW LEFT. This
  // used to carve the two admin <section>s and the gate out of the front page
  // before scanning it, because markup inside them is only ever interactive for
  // an admin, who has the modules by then. Neither the sections nor the gate is
  // on that document any more, so the ENTIRE front page is scanned — a stricter
  // test than the one it replaces, and the reason the guard on
  // updateExpansionStats() in the data-load path still has to be there: on Home
  // that call can now never resolve.
  const scan = (label, src, lines) => {
    for (const name of ADMIN_ONLY) {
      const re = new RegExp(`(?<![\\w$.])${name}\\s*\\(`);
      lines.forEach((ln, i) => {
        if (!re.test(ln) && !ln.includes("window." + name)) return;
        ok(guarded(lines, i, name),
          `${label} calls the admin-only ${name}() outside the gate without a typeof guard — for a reader it is undefined`);
      });
    }
  };
  // A `//` LINE IS PROSE, NOT A CALL SITE, AND THE .js BRANCH BELOW ALREADY
  // KNOWS THAT. index.html's data-load path keeps its typeof guard on
  // updateExpansionStats() and explains in seven commented lines above the guard
  // why the guard outlived the tool — one of those lines names the function with
  // its parentheses, which the naive line scan read as an unguarded call three
  // lines too high to see the guard. Blank the comment lines rather than the
  // whole line array, so the indices the guard lookback walks stay the document's
  // own and a real call on line N is still reported as line N.
  const codeLines = (src) => src.replace(/^\s*\/\/.*$/gm, "").split("\n");
  scan("index.html", HTML, codeLines(HTML));

  // admin.html keeps a window, and it is the same two landmarks it always was.
  const secStart = ADMIN_HTML.indexOf('<section id="database-expansion"');
  const pmStart = ADMIN_HTML.indexOf('<section id="politician-manager"');
  must(secStart > 0 && pmStart > 0, "the admin sections were renamed — the exclusion no longer matches");
  const gateEnd = ADMIN_HTML.indexOf("var ADMIN_EMAILS");
  must(gateEnd > pmStart, "admin.html's gate no longer sits after its sections — the exclusion window is inverted");
  const publicAdmin = ADMIN_HTML.slice(0, Math.min(secStart, pmStart)) + "\n" + ADMIN_HTML.slice(gateEnd);
  scan("admin.html", publicAdmin, codeLines(publicAdmin));

  for (const f of SHIPPED) {
    const lines = R(f).replace(/^\s*\/\/.*$/gm, "").split("\n");
    for (const name of ADMIN_ONLY) {
      lines.forEach((ln, i) => {
        // Only window.-qualified reaches count here: a module with its own local
        // function of the same name (compare-table.js has a pmClearFilters) is
        // not reaching across the gate at all.
        if (!ln.includes("window." + name)) return;
        ok(guarded(lines, i, name),
          `${f}:${i + 1} reaches window.${name} (admin-only) without a typeof guard`);
      });
    }
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ admin critical path: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ admin critical path: 451 KB of admin JS is gated, the public hygiene layer is not — ${passed} assertions passed\n`);
