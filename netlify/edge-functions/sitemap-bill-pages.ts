// /sitemap.xml — the committed sitemap, plus every generated bill page.
//
// The file itself is unchanged and still written by scripts/gen-sitemap.mjs.
// This adds a <url> line for each page the scheduled bill job stored in Blobs
// "bill-pages", at the same /b/<congress>/<number> address the snapshot bills
// use (netlify/lib/sitemap-bill-pages.ts). Same address, same document: no new
// route. If the store cannot be listed in time, the committed file is served
// as it is.
import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { BILL_PAGES_STORE, BILL_PAGES_PREFIX, mergeBillPages } from "../lib/sitemap-bill-pages.ts";

const LIST_TIMEOUT_MS = 3000;

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
  const [xml, keys] = await Promise.all([doc.text(), storedKeys()]);
  const merged = keys && keys.length ? mergeBillPages(xml, keys).xml : xml;
  const headers = new Headers(doc.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.delete("content-length");
  headers.set("cache-control", "public, max-age=3600");
  return new Response(merged, { status: doc.status, headers });
};

export const config: Config = {
  path: "/sitemap.xml",
};
