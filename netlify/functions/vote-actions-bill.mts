// GET /api/vote-actions/bill?key=<bill_key> — PUBLIC. The roll calls on one bill
// that pass the automatic publish gate (netlify/lib/vote-actions-publish.ts), each
// with its member votes, for the "Roll calls on the record" section of the bill
// page (/b/<congress>/<number>, bill-roll-calls.js). The bill key is the shared
// one ("us-119-hr-5000"). The gate is judged per roll call: a held roll call is
// left out and the bill's other roll calls still come back. Only public fields
// leave: roster ids and the record's own names for members with a PolitiDex
// file, counts for the rest — no member ids, no raw payload keys. No scoring,
// tally or verdict reads it.
import type { Config } from "@netlify/functions";
import { publishDeps } from "../lib/vote-actions-db.js";
import { publishedForBill } from "../lib/vote-actions-publish.js";

const json = (status: number, body: unknown, cache = "no-store") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": cache } });

export default async (req: Request): Promise<Response> => {
  const key = String(new URL(req.url).searchParams.get("key") || "").trim();
  if (!/^us-[0-9]{1,3}-[a-z]{1,8}-[0-9]{1,6}(?:-[0-9]{1,4})?$/.test(key)) return json(400, { error: "bill key required" });
  try {
    return json(200, await publishedForBill(key, publishDeps), "public, max-age=300");
  } catch (e: any) {
    return json(500, { error: "published roll calls unavailable" });
  }
};

export const config: Config = {
  path: "/api/vote-actions/bill",
  method: ["GET"],
};
