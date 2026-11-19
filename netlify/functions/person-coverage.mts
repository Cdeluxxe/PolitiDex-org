// GET /api/person-coverage?pid=<roster id> — PUBLIC. The Phase 5 sections of a
// person file, in one read:
//   committees      db/person-committees.json (scripts/gen-committees.mjs, from
//                   the House Clerk and Senate membership files)
//   cosponsorships  db/cosponsorships.json (scripts/gen-cosponsorships.mjs, from
//                   Congress.gov) — separate from "Bills sponsored"
//   funding         db/person-funding.json (scripts/gen-funding.mjs, FEC bulk
//                   files) — separate from the AIPAC chip, which is unchanged
//   attendance      counted from this person's PUBLISHED roll calls only
//                   (publishedForPolitician → attendanceFrom), not an official score
// Committees and co-sponsorships come from the copy the Phase 7 scheduled
// pulls published (congress-sync-live.mjs) when it is at least as new as the
// committed file, else from the committed file.
// A section the data does not cover is null, and the person file draws nothing
// for it. A database failure leaves attendance null and serves the rest.
//
// GET /api/bill-cosponsors?bill=<sitting>|<number> — PUBLIC. The roster members
// Congress.gov lists as co-sponsors of one bill, for the bill page.
import type { Config } from "@netlify/functions";
import committeesFile from "../../db/person-committees.json" with { type: "json" };
import cosponsorFile from "../../db/cosponsorships.json" with { type: "json" };
import fundingFile from "../../db/person-funding.json" with { type: "json" };
import { publishDeps } from "../lib/vote-actions-db.js";
import { publishedForPolitician, attendanceFrom } from "../lib/vote-actions-publish.js";
import { committeesFor, cosponsorshipsFor, fundingFor, billCosponsorsFor } from "../lib/coverage-pages.js";
import { getStore } from "@netlify/blobs";
import { liveFile } from "../lib/congress-sync-live.mjs";

const storeFor = (name: string) => getStore(name);
const committeesNow = liveFile("db/person-committees.json", committeesFile, { storeFor });
const cosponsorsNow = liveFile("db/cosponsorships.json", cosponsorFile, { storeFor });

const json = (status: number, body: unknown, cache = "public, max-age=300") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname === "/api/bill-cosponsors") {
    const key = String(url.searchParams.get("bill") || "").trim();
    if (!/^\d{1,3}\|[A-Za-z.]{1,12} \d{1,6}$/.test(key)) return json(400, { error: "bill required (<congress>|<citation>)" }, "no-store");
    return json(200, billCosponsorsFor(key, await cosponsorsNow()) || { key, cosponsors: null });
  }
  const pid = String(url.searchParams.get("pid") || "").trim();
  if (!/^[a-z0-9_]{1,80}$/.test(pid)) return json(400, { error: "pid required" }, "no-store");
  let attendance: any = null;
  try {
    const a = attendanceFrom(await publishedForPolitician(pid, publishDeps));
    attendance = a.rolls ? a : null;
  } catch (e: any) {
    console.log(`person-coverage: attendance unavailable (${e?.message || e})`);
  }
  return json(200, {
    pid,
    committees: committeesFor(pid, await committeesNow()),
    cosponsorships: cosponsorshipsFor(pid, await cosponsorsNow()),
    funding: fundingFor(pid, fundingFile),
    attendance,
  });
};

export const config: Config = {
  path: ["/api/person-coverage", "/api/bill-cosponsors"],
  method: ["GET"],
};
