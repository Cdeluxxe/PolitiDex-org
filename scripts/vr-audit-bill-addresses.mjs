#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-audit-bill-addresses.mjs — ask the live resolver whether the sitemap is true
// ─────────────────────────────────────────────────────────────────────────────
// gen-sitemap.mjs derives the bill addresses from the migrations, offline, so
// that --check can mean "the committed file matches the repo". That is the right
// trade for a build step and it leaves exactly one thing unproven: whether the
// database actually agrees. A migration that inserted a row and a later one that
// renamed it, a row the ingest revised, a number spelled with a non-breaking
// space — any of those would produce an address that parses beautifully here and
// answers "Measure not found" at the edge.
//
// So this script does the one thing the generator must not: it walks the
// committed sitemap and asks the live measure-ref endpoint about every /b/
// address in it. Read-only, no writes, no credentials, one GET per address.
//
//   node scripts/vr-audit-bill-addresses.mjs
//   node scripts/vr-audit-bill-addresses.mjs --origin https://deploy-preview-…netlify.app
//   node scripts/vr-audit-bill-addresses.mjs --limit 25       # spot-check
//
// Exit 1 if any advertised address does not resolve. Transport failures are
// reported separately from refusals: a timeout is not evidence of a bad address,
// and counting it as one would turn a flaky network into a false accusation.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 || i === argv.length - 1 ? dflt : argv[i + 1];
};
const ORIGIN = String(arg("--origin", "https://www.politidex.fyi")).replace(/\/+$/, "");
const LIMIT = Number(arg("--limit", "0")) || 0;
const CONCURRENCY = 6; // polite: this is somebody's production API, not a load test

const XML = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const addresses = [...XML.matchAll(/<loc>[^<]*?\/b\/([^/<]+)\/([^<]+)<\/loc>/g)]
  .map((m) => ({ sitting: m[1], number: m[2] }));
if (!addresses.length) {
  console.error("no /b/ addresses in sitemap.xml — nothing to audit");
  process.exit(1);
}
const work = LIMIT ? addresses.slice(0, LIMIT) : addresses;

console.log(`auditing ${work.length} bill address(es) against ${ORIGIN}`);

const unresolved = [];
const transport = [];
let resolved = 0;
let done = 0;

async function check(a) {
  const url = `${ORIGIN}/api/voting-record/measure-ref/${a.sitting}/${a.number}`;
  const shown = `/b/${a.sitting}/${a.number}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    const body = await r.text();
    let doc = null;
    try { doc = JSON.parse(body); } catch { /* non-JSON is itself the failure */ }
    if (r.ok && doc && doc.measure && doc.measure.id) resolved++;
    else unresolved.push(`${shown} → ${r.status} ${String(body).slice(0, 120)}`);
  } catch (e) {
    transport.push(`${shown} → ${String((e && e.message) || e).slice(0, 120)}`);
  }
  done++;
  if (done % 50 === 0) process.stdout.write(`  … ${done}/${work.length}\n`);
}

const queue = work.slice();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let a = queue.shift(); a; a = queue.shift()) await check(a);
}));

console.log("");
console.log(`resolved     ${resolved}/${work.length}`);
console.log(`unresolved   ${unresolved.length}`);
console.log(`transport    ${transport.length}`);
for (const u of unresolved.slice(0, 20)) console.log(`  ✗ ${u}`);
for (const t of transport.slice(0, 10)) console.log(`  ? ${t}`);

if (unresolved.length) {
  console.error(`\n✗ ${unresolved.length} advertised bill address(es) do not resolve. ` +
                `The sitemap is recommending pages that answer "that link didn’t resolve to a measure we could load".`);
  process.exit(1);
}
if (transport.length) {
  console.error(`\n? ${transport.length} address(es) could not be reached — rerun before drawing a conclusion.`);
  process.exit(1);
}
console.log(`\n✓ every advertised bill address resolves at ${ORIGIN}`);
