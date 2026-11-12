#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// gen-dirkey-auto.mjs — the repeatable pass of the automatic candidate generator
//
// Reads the first-party pages the site already links on stance cards
// (politician-stances-core/ext.js and the state-senate-stances files, the
// same set person.html loads) for people NOT in the ground-truth set, and runs
// netlify/lib/dirkey-auto-core.mjs on them: the scorer's read and the bill
// finder's matches on every approved directional key (keys with a bill
// pattern). Writes:
//   person-directional-keys-auto.json   new people (≤ 40 per run), each person
//                                       and row tagged internally { source: "auto" }
//   db/dirkey-auto-queue.json           who has been read (and with which pages),
//                                       so the rest stay queued for the next run
//   db/dirkey-proposed-keys.json        proposed keys from bills matching no key;
//                                       ignored until approved and given a pattern
// Hand-checked people (person-directional-keys.json and the ground-truth files)
// are never read or written here.
//
//   node scripts/gen-dirkey-auto.mjs [--cap 40] [--dry-run]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as A from "../netlify/lib/dirkey-auto-core.mjs";
import { FETCH_TIMEOUT_MS, MAX_BODY_CHARS } from "../netlify/lib/raw-ingest-core.mjs";
import { loadCatalog, loadGroundTruth } from "./bill-finder-ground-truth-2026-11.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const AUTO_TABLE = path.join(root, "person-directional-keys-auto.json");
export const QUEUE_FILE = path.join(root, "db/dirkey-auto-queue.json");
export const PROPOSALS_FILE = path.join(root, "db/dirkey-proposed-keys.json");
const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : d);

/** window.ISSUE_STANCE_DATA as person.html builds it. */
export function loadStanceData() {
  const files = fs.readdirSync(root).filter((f) => /^(?:politician-stances-(?:core|ext)|state-senate-stances(?:-w\d+)?)\.js$/.test(f)).sort();
  const ctx = { window: {} };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(`var window = this.window;\n${fs.readFileSync(path.join(root, f), "utf8")}`, ctx);
  return ctx.window.ISSUE_STANCE_DATA || {};
}

/** Every person with a hand-checked record: never read by the generator. */
export function groundTruthPeople() {
  const main = readJson(path.join(root, "person-directional-keys.json"), { people: {} });
  const gt = loadGroundTruth();
  return new Set([...Object.keys(main.people || {}), ...[gt, ...(gt.additional_records || [])].map((r) => r.politician_id)]);
}

async function fetchOnce(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "PolitiDex stance generator (+https://politidex.fyi)", accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const body = (await res.text()).slice(0, MAX_BODY_CHARS);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    if (!/<|\w/.test(body)) return { ok: false, error: "empty body" };
    return { ok: true, body };
  } catch (e) { return { ok: false, error: e?.message || String(e) }; }
}

// Pages are fetched a few people ahead of the person being read, eight at a time.
function prefetcher(queue, ahead = 8) {
  const cache = new Map();
  const idx = new Map();
  const uses = new Map();
  queue.forEach((p, i) => p.sources.forEach((s) => { if (!idx.has(s.url)) idx.set(s.url, i); uses.set(s.url, (uses.get(s.url) || 0) + 1); }));
  const get = (url) => { if (!cache.has(url)) cache.set(url, fetchOnce(url)); return cache.get(url); };
  return async (url) => {
    const i = idx.get(url) ?? 0;
    for (const p of queue.slice(i, i + ahead)) for (const s of p.sources) get(s.url);
    const r = await get(url);
    // Free the body once its last reader has it.
    const left = (uses.get(url) || 1) - 1;
    uses.set(url, left);
    if (left <= 0) cache.set(url, Promise.resolve({ ok: false, error: "already read" }));
    return r;
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const capAt = argv.indexOf("--cap");
  const cap = capAt >= 0 ? Math.min(A.AUTO_SOFT_CAP, Number(argv[capAt + 1]) || A.AUTO_SOFT_CAP) : A.AUTO_SOFT_CAP;
  const dry = argv.includes("--dry-run");
  const state = readJson(QUEUE_FILE, { processed: {} });
  const table = readJson(AUTO_TABLE, { people: {} });
  const exclude = groundTruthPeople();
  for (const pid of Object.keys(table.people || {})) exclude.add(pid);
  const queue = A.buildQueue(loadStanceData(), { exclude, state });
  console.log(`dirkey-auto: ${queue.length} person(s) queued · soft cap ${cap}`);
  const res = await A.runGenerator({ queue, fetchPage: prefetcher(queue), catalog: loadCatalog(), state, cap, log: (l) => console.log(l) });
  const keysMeta = readJson(path.join(root, "person-directional-keys.json"), { keys: {} }).keys;
  const nextTable = A.mergeAutoTable(table, res, { keysMeta });
  const proposals = A.proposeKeys(res.unmapped, readJson(PROPOSALS_FILE, {}), { run: res.run });
  const runs = [...(state.runs || []), res.summary].slice(-20);
  const nextState = {
    _comment: "WRITTEN by scripts/gen-dirkey-auto.mjs. Who the automatic generator has read, with a fingerprint of their linked first-party pages; a person whose pages change is queued again. People not listed are still queued.",
    soft_cap: A.AUTO_SOFT_CAP, runs, processed: Object.fromEntries(Object.entries(res.state.processed).sort(([a], [b]) => a.localeCompare(b))),
  };
  console.log(JSON.stringify(res.summary, null, 2));
  console.log(`dirkey-auto: ${Object.keys(proposals.proposals).length} proposed key(s) on file (none used until approved and given a pattern)`);
  if (!dry) {
    fs.writeFileSync(AUTO_TABLE, JSON.stringify(nextTable, null, 2) + "\n");
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(nextState, null, 2) + "\n");
    fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(proposals, null, 2) + "\n");
  }
}
