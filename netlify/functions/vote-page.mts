// GET /vote/<congress>/<chamber>/<session>/<roll> — PUBLIC. The roll-call page.
//
// netlify.toml rewrites that four-segment address here (ahead of the older
// three-segment /vote/<congress>/<chamber>/<roll> rewrite to index.html, which
// is unchanged and still opens the curated measure in the app).
//
// ONLY PUBLISHED ROLL CALLS. publishedRollCall (vote-actions-publish.ts) runs
// the same automatic publish gate the person and bill reads use; a roll call
// that is not on file, or is held, gets an honest 404 page — never a 200 that
// looks like it worked. The page shows the bill, the question, the date, the
// chamber, the result, the totals and each listed member's vote, linked to
// their /p/ file. Server-rendered so a crawler and a reader without JavaScript
// see the same record.
import type { Config } from "@netlify/functions";
import { publishDeps } from "../lib/vote-actions-db.js";
import { publishedRollCall } from "../lib/vote-actions-publish.js";
import { parseRollPath, rollPageHtml, rollNotFoundHtml } from "../lib/coverage-pages.js";

const html = (status: number, body: string, cache: string) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache } });

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  // Reached by rewrite: the original address is the path; the function's own
  // path carries the same four segments, so either one parses.
  const path = url.pathname.replace(/^\/api\/vote-page/, "/vote");
  const r = parseRollPath(path);
  if (!r) return html(404, rollNotFoundHtml(null), "public, max-age=300");
  try {
    const data = await publishedRollCall(r, publishDeps);
    if (!data) return html(404, rollNotFoundHtml(r), "public, max-age=120");
    return html(200, rollPageHtml(data), "public, max-age=300");
  } catch (e: any) {
    console.log(`vote-page: ERROR ${e?.message || e}`);
    return html(503, rollNotFoundHtml(r).replace("We don’t have that roll call published.", "This roll call could not be loaded right now."), "no-store");
  }
};

export const config: Config = {
  path: "/api/vote-page/:congress/:chamber/:session/:roll",
  method: ["GET"],
};
