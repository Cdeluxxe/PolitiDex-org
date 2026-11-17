// /bill-pages.js — the committed client list of bills with a page, plus every
// generated bill page.
//
// The file is unchanged and still written by scripts/gen-bill-pages.mjs. This
// appends one statement adding each page the scheduled bill job stored in Blobs
// "bill-pages" that the file does not already list, keyed "<congress>/<number>"
// like the rest (netlify/lib/sitemap-bill-pages.ts), so the person-page issue
// drawer links it the way it links a snapshot bill. Same address, same script:
// no new route. If the store cannot be listed in time, the committed file is
// served as it is.
import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { BILL_PAGES_STORE, BILL_PAGES_PREFIX, mergeClientBillPages } from "../lib/sitemap-bill-pages.ts";

const LIST_TIMEOUT_MS = 2000;

async function storedKeys(): Promise<string[] | null> {
  try {
    const listed = getStore(BILL_PAGES_STORE).list({ prefix: BILL_PAGES_PREFIX });
    const res: any = await Promise.race([listed, new Promise((r) => setTimeout(() => r(null), LIST_TIMEOUT_MS))]);
    return res && Array.isArray(res.blobs) ? res.blobs.map((b: { key: string }) => b.key) : null;
  } catch {
    return null;
  }
}

export default async (_req: Request, context: Context): Promise<Response> => {
  const doc = await context.next();
  if (!doc.ok) return doc;
  const [js, keys] = await Promise.all([doc.text(), storedKeys()]);
  const merged = keys && keys.length ? mergeClientBillPages(js, keys).js : js;
  const headers = new Headers(doc.headers);
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "public, max-age=300");
  return new Response(merged, { status: doc.status, headers });
};

export const config: Config = {
  path: "/bill-pages.js",
};
