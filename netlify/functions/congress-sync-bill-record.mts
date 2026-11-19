// Scheduled · Phase 7 — the bill record, from Congress.gov.
//
// Daily pass, 05:00–05:50 UTC in 10-minute slices: re-reads every federal
// measure that has a bill page (db/bill-docs.json) from the Congress.gov API —
// sponsors, co-sponsors and the key actions — and publishes the file
// scripts/fetch-bill-record.mjs writes (db/bill-record.json, Utah entries
// carried over) to the "congress-sync" blob store. Nothing in the repo or the
// database is written; scripts/sync-congress-snapshots.mjs brings it into db/.
// How a pass works, and why a failure writes nothing:
// netlify/lib/congress-sync-core.mjs.
//
// Env: CONGRESS_GOV_API_KEY (CONGRESS_API_KEY accepted as an alias).
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runSlice, STORE_NAME } from "../lib/congress-sync-core.mjs";
import billDocs from "../../db/bill-docs.json" with { type: "json" };
import billRecord from "../../db/bill-record.json" with { type: "json" };

export const JOB = "bill-record";

export async function run(deps: Record<string, any> = {}) {
  let store = deps.store;
  if (!store) {
    try { store = getStore({ name: STORE_NAME, consistency: "strong" }); }
    catch (e: any) { const line = `congress-sync ${JOB} FAIL — blob store unavailable (${e?.message || e}) (nothing written)`; console.log(line); return { status: 502, line }; }
  }
  return runSlice(JOB, { env: process.env, inputs: { billDocs, billRecord }, ...deps, store });
}

export default async (): Promise<Response> => {
  const r = await run();
  return new Response(r.line, { status: r.status, headers: { "content-type": "text/plain" } });
};

export const config: Config = {
  schedule: "*/10 5 * * *",
};
