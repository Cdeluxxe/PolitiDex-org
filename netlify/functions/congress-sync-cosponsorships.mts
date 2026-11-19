// Scheduled · Phase 7 — co-sponsorships, from Congress.gov.
//
// Daily pass, 06:00–06:50 UTC in 10-minute slices: for every federal member
// the voting-record member map ties to a roster file, reads Congress.gov's
// list of measures the member co-sponsored (GET /v3/member/<bioguide>/
// cosponsored-legislation) in the Congress db/cosponsorship-source.json is
// for, and publishes db/cosponsorship-source.json and its derived
// db/cosponsorships.json — the files scripts/gen-cosponsorships.mjs writes —
// to the "congress-sync" blob store. /api/person-coverage and
// /api/bill-cosponsors serve the published db/cosponsorships.json; the
// committed copy is the fallback. How a pass works, and why a failure writes
// nothing: netlify/lib/congress-sync-core.mjs.
//
// Env: CONGRESS_GOV_API_KEY (CONGRESS_API_KEY accepted as an alias).
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runSlice, STORE_NAME } from "../lib/congress-sync-core.mjs";
import memberMap from "../../db/vr-member-map.json" with { type: "json" };
import shareIndex from "../../db/share-index.json" with { type: "json" };
import billDocs from "../../db/bill-docs.json" with { type: "json" };
import cosponsorshipSource from "../../db/cosponsorship-source.json" with { type: "json" };

export const JOB = "cosponsorships";

export async function run(deps: Record<string, any> = {}) {
  let store = deps.store;
  if (!store) {
    try { store = getStore({ name: STORE_NAME, consistency: "strong" }); }
    catch (e: any) { const line = `congress-sync ${JOB} FAIL — blob store unavailable (${e?.message || e}) (nothing written)`; console.log(line); return { status: 502, line }; }
  }
  return runSlice(JOB, { env: process.env, inputs: { memberMap, shareIndex, billDocs, cosponsorshipSource }, ...deps, store });
}

export default async (): Promise<Response> => {
  const r = await run();
  return new Response(r.line, { status: r.status, headers: { "content-type": "text/plain" } });
};

export const config: Config = {
  schedule: "*/10 6 * * *",
};
