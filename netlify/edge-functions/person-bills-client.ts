// /person-bills.json — the committed sponsor table the person file's "Bills
// sponsored" list reads, plus every generated bill page with a roster-linked
// sponsor.
//
// The file is unchanged and still written by scripts/gen-bill-docs.mjs. This
// adds each generated page (the scheduled bill job's, read from the bill-pages
// store's one page index — netlify/lib/bill-pages-index.ts) that names a roster
// member as sponsor: one bill row in the file's own shape and one [row, "s"] ref
// under that person, the role the page itself gives them. A bill the file
// already lists is left exactly as it is. So a person tied to a generated bill
// sees it in their list, and it opens the same /b/ page that links back to
// them. Same address, same document: no new route. If the index cannot be read
// in time, the committed file is served as it is.
//
// The other person bill list, "Recorded votes" (person-recorded-votes.js), needs
// nothing here: it reads the raw vote feed the same job writes, and already
// links each bill to its /b/ address, generated or not.
import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { BILL_PAGES_INDEX_STORE, BILL_PAGES_INDEX_KEY, mergePersonBills, type BillPagesIndex } from "../lib/bill-pages-index.ts";

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
  const [body, index] = await Promise.all([doc.text(), readIndex()]);
  let out = body;
  if (index) {
    try {
      const merged = mergePersonBills(JSON.parse(body), index);
      if (merged.added) out = JSON.stringify(merged.data);
    } catch { out = body; }
  }
  const headers = new Headers(doc.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "public, max-age=300");
  return new Response(out, { status: doc.status, headers });
};

export const config: Config = {
  path: "/person-bills.json",
};
