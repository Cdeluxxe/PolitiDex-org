// /sitemap.xml — the committed sitemap, plus every generated bill page, plus
// every person file pipeline positions carry over the publication floor.
//
// The file itself is unchanged and still written by scripts/gen-sitemap.mjs.
// This adds a <url> line for each page the scheduled bill job stored in Blobs
// "bill-pages", at the same /b/<congress>/<number> address the snapshot bills
// use (netlify/lib/sitemap-bill-pages.ts). Same address, same document: no new
// route. If the store cannot be listed in time, the committed file is served
// as it is.
//
// PERSON FILES. The floor counts pipeline positions (stance cards promoted from
// Evidence Locker items, in the database), which the offline generator cannot
// read, so it writes db/sitemap-floor-pending.json: for each file it turned
// away, how many pipeline positions would carry it over. This reads the live
// pipeline keys (GET /api/stated-positions?view=keys) and adds /p/<pid> for each
// pending file that now has enough, directly after the generator's own /p/
// lines (netlify/lib/sitemap-person-pipeline.ts). If the keys cannot be read in
// time, nothing is added and the committed person list is served as it is.
import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { BILL_PAGES_STORE, BILL_PAGES_PREFIX, mergeBillPages } from "../lib/sitemap-bill-pages.ts";
import { mergePipelinePeople, type PendingTable } from "../lib/sitemap-person-pipeline.ts";
import { pipelineKeys } from "../lib/pipeline-positions.ts";
import pendingFile from "../../db/sitemap-floor-pending.json" with { type: "json" };

const LIST_TIMEOUT_MS = 3000;
const PENDING: PendingTable = ((pendingFile as unknown as { pending?: PendingTable }).pending) || {};

async function storedKeys(): Promise<string[] | null> {
  try {
    const listed = getStore(BILL_PAGES_STORE).list({ prefix: BILL_PAGES_PREFIX });
    const res: any = await Promise.race([listed, new Promise((r) => setTimeout(() => r(null), LIST_TIMEOUT_MS))]);
    return res && Array.isArray(res.blobs) ? res.blobs.map((b: { key: string }) => b.key) : null;
  } catch {
    return null;
  }
}

export default async (req: Request, context: Context): Promise<Response> => {
  const doc = await context.next();
  if (!doc.ok) return doc;
  let origin = "";
  try { origin = new URL(req.url).origin; } catch { origin = ""; }
  const [xml, keys, pipe] = await Promise.all([
    doc.text(),
    storedKeys(),
    origin ? pipelineKeys(origin).catch(() => null) : Promise.resolve(null),
  ]);
  let merged = keys && keys.length ? mergeBillPages(xml, keys).xml : xml;
  if (pipe) merged = mergePipelinePeople(merged, PENDING, pipe).xml;
  const headers = new Headers(doc.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=3600");
  return new Response(merged, { status: doc.status, headers });
};

export const config: Config = {
  path: "/sitemap.xml",
};
