// /bill-search-index.js — the committed site-search list of bill pages, plus
// every generated bill page.
//
// The file is unchanged and still written by scripts/gen-bill-docs.mjs. The eye
// (all-seeing-eye.js) searches it by number and title. This appends one
// statement adding each page the scheduled bill job generated that the file
// does not already hold, read from the bill-pages store's one page index
// (netlify/lib/bill-pages-index.ts), in the file's own row shape — so a
// generated /b/ page is findable the way a snapshot bill page is. Same address,
// same script: no new route. If the index cannot be read in time, the committed
// file is served as it is.
import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { BILL_PAGES_INDEX_STORE, BILL_PAGES_INDEX_KEY, mergeSearchIndex, type BillPagesIndex } from "../lib/bill-pages-index.ts";

const READ_TIMEOUT_MS = 2000;

async function readIndex(): Promise<BillPagesIndex | null> {
  try {
    const got = getStore(BILL_PAGES_INDEX_STORE).get(BILL_PAGES_INDEX_KEY, { type: "json" });
    const res: any = await Promise.race([got, new Promise((r) => setTimeout(() => r(null), READ_TIMEOUT_MS))]);
    return res && res.pages && typeof res.pages === "object" ? (res as BillPagesIndex) : null;
  } catch {
    return null;
  }
}

export default async (_req: Request, context: Context): Promise<Response> => {
  const doc = await context.next();
  if (!doc.ok) return doc;
  const [js, index] = await Promise.all([doc.text(), readIndex()]);
  const merged = index ? mergeSearchIndex(js, index).js : js;
  const headers = new Headers(doc.headers);
  headers.set("content-type", "application/javascript; charset=utf-8");
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "public, max-age=300");
  return new Response(merged, { status: doc.status, headers });
};

export const config: Config = {
  path: "/bill-search-index.js",
};
