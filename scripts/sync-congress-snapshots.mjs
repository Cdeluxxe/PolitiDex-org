#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// sync-congress-snapshots.mjs — bring the scheduled pulls' files into db/
// ─────────────────────────────────────────────────────────────────────────────
// The Phase 7 scheduled functions (netlify/functions/congress-sync-*.mts) pull
// Congress.gov and the chamber membership files daily and publish what the
// CLI pull stages would have written to the "congress-sync" blob store — a
// deployed function cannot commit. This copies the SOURCE files of each
// finished pass into db/:
//
//   bill-record      db/bill-record.json            (fetch-bill-record.mjs's file)
//   cosponsorships   db/cosponsorship-source.json   (gen-cosponsorships --fetch's)
//   committees       db/committee-source.json       (gen-committees --fetch's)
//
// then runs scripts/check-generators.mjs --fix, which re-derives everything
// downstream (bill docs and pages, person-committees.json, cosponsorships.json,
// the sitemap) exactly as a manual pull would, and logs what changed since the
// previous pull to db/congress-changes.json (scripts/gen-congress-changes.mjs —
// the /changes feed's committee, co-sponsorship and bill-status lanes). Commit
// the result.
//
// A file is copied only when its pass finished (state/<job> is "done"), the
// file carries that pass's id, it parses, and it is not older than the copy
// already in db/. Anything else is reported and skipped; nothing is half-written.
//
// USAGE
//   NETLIFY_SITE_ID=… NETLIFY_AUTH_TOKEN=… node scripts/sync-congress-snapshots.mjs
//     --job <name>   just one job (repeatable)
//     --dry-run      report what would change; write nothing
//     --no-regen     copy the source files only; skip check-generators --fix
// Exit: 0 synced (or already current) · 1 a job was skipped · 2 error.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { STORE_NAME, JOBS, fileKey, stateKey } from "../netlify/lib/congress-sync-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SOURCE_FILES = {
  "bill-record": "db/bill-record.json",
  cosponsorships: "db/cosponsorship-source.json",
  committees: "db/committee-source.json",
};

const fetchedOnOf = (text) => { try { return String(JSON.parse(text).fetchedOn || ""); } catch { return null; } };

// One job: store → { action: "write" | "current" | "skip", reason, text }
export async function planJob(store, job, root = ROOT) {
  const path = SOURCE_FILES[job];
  const state = await store.get(stateKey(job), { type: "json" });
  if (!state || state.status !== "done") return { job, path, action: "skip", reason: `no finished pass (${state?.status || "never run"}${state?.error ? `: ${state.error}` : ""})` };
  const got = await store.getWithMetadata(fileKey(path), { type: "text" });
  if (!got || got.data == null) return { job, path, action: "skip", reason: "pass finished but its file is missing" };
  if (got.metadata?.passId !== state.passId) return { job, path, action: "skip", reason: "file is from a different pass than the finished one" };
  const day = fetchedOnOf(got.data);
  if (day === null) return { job, path, action: "skip", reason: "file does not parse" };
  const p = join(root, path);
  const prev = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (prev === got.data) return { job, path, action: "current", reason: `already current (${day})` };
  const prevDay = prev ? fetchedOnOf(prev) || "" : "";
  if (prevDay && day < prevDay) return { job, path, action: "skip", reason: `published copy (${day}) is older than db/ (${prevDay})` };
  return { job, path, action: "write", reason: `${prevDay || "none"} → ${day}`, text: got.data };
}

async function main() {
  const args = process.argv.slice(2);
  const jobs = args.flatMap((a, i) => (a === "--job" ? [args[i + 1]] : []));
  for (const j of jobs) if (!JOBS.includes(j)) throw new Error(`unknown job ${j} (one of ${JOBS.join(", ")})`);
  const dry = args.includes("--dry-run");
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN;
  if (!siteID || !token) throw new Error("NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN are required to read the blob store");
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: STORE_NAME, siteID, token, consistency: "strong" });
  let skipped = 0, wrote = 0;
  for (const job of jobs.length ? jobs : JOBS) {
    const r = await planJob(store, job);
    console.log(`${job.padEnd(15)} ${r.action.toUpperCase().padEnd(8)} ${r.path} — ${r.reason}`);
    if (r.action === "skip") skipped++;
    if (r.action === "write" && !dry) { writeFileSync(join(ROOT, r.path), r.text); wrote++; }
  }
  if (wrote && !args.includes("--no-regen")) {
    const g = spawnSync(process.execPath, [join(ROOT, "scripts/check-generators.mjs"), "--fix"], { cwd: ROOT, stdio: "inherit" });
    if (g.status !== 0) { console.error("check-generators --fix did not converge"); process.exit(2); }
  }
  process.exit(skipped ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message || e); process.exit(2); });
