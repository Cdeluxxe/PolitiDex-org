// Scheduled · Phase 7 — committee memberships, from the chambers.
//
// Daily, 04:40 UTC, one invocation: reads the two official membership files
// scripts/gen-committees.mjs --fetch reads (the House Clerk's MemberData.xml
// and the Senate LIS cvc_member_data.xml — Congress.gov publishes no
// member→committee list, so no API key is used) and publishes
// db/committee-source.json and its derived db/person-committees.json to the
// "congress-sync" blob store. /api/person-coverage serves the published
// db/person-committees.json; the committed copy is the fallback, and
// /committee/<code> pages stay on the committed copy until it is synced.
// How a pass works, and why a failure writes nothing:
// netlify/lib/congress-sync-core.mjs.
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runSlice, STORE_NAME } from "../lib/congress-sync-core.mjs";
import memberMap from "../../db/vr-member-map.json" with { type: "json" };
import shareIndex from "../../db/share-index.json" with { type: "json" };

export const JOB = "committees";

export async function run(deps: Record<string, any> = {}) {
  let store = deps.store;
  if (!store) {
    try { store = getStore({ name: STORE_NAME, consistency: "strong" }); }
    catch (e: any) { const line = `congress-sync ${JOB} FAIL — blob store unavailable (${e?.message || e}) (nothing written)`; console.log(line); return { status: 502, line }; }
  }
  return runSlice(JOB, { env: process.env, inputs: { memberMap, shareIndex }, ...deps, store });
}

export default async (): Promise<Response> => {
  const r = await run();
  return new Response(r.line, { status: r.status, headers: { "content-type": "text/plain" } });
};

export const config: Config = {
  schedule: "40 4 * * *",
};
