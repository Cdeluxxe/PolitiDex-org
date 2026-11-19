// ─────────────────────────────────────────────────────────────────────────────
// bill-pages-index — one small index of the generated bill pages
// ─────────────────────────────────────────────────────────────────────────────
// The scheduled bill job (vote-actions-core.ts) writes one page record per bill
// into Blobs "bill-pages", keyed "us/<congress>/<number>". The /b/ document, the
// sitemap and the client's bill-page list already read that store. Two more
// surfaces need the generated pages and cannot list-and-read hundreds of blobs
// per request:
//
//   · site search (the eye, all-seeing-eye.js) searches bill-search-index.js,
//     the committed list of bill pages, by number and title;
//   · the person file's "Bills sponsored" list reads person-bills.json, the
//     committed sponsor table.
//
// So the cron keeps ONE index blob beside the pages ("index/pages-v1", outside
// the "us/" prefix every other reader lists), refreshed from the store itself
// after each run: listed by key and etag, so a page that was rewritten is re-read
// and a page that is gone is dropped (refreshBillPagesIndex). The edge serves
// both committed files unchanged and appends what the index adds — the same
// "same address, same document" arrangement as bill-pages-client.ts — and if the
// index cannot be read in time the committed file is served as it is.
//
// What a row carries is what the page record already prints: sitting, number,
// title, status, status label, chamber, the issue keys, and the roster-linked
// sponsors (the page names only sponsors the member map links to a roster file;
// co-sponsors are counted on the page, never named, so they are not listed here).
//
// Pure except refreshBillPagesIndex, which takes the store as an argument.

export const BILL_PAGES_INDEX_STORE = "bill-pages";
export const BILL_PAGES_INDEX_KEY = "index/pages-v1";
export const BILL_PAGES_INDEX_VERSION = "bp-index-v1";
const PAGE_PREFIX = "us/";

export type IndexEntry = {
  s: string; n: string; t?: string; st?: string; sl?: string; g?: string; c?: string;
  k?: string[]; sp?: string[]; e?: string;
};
export type BillPagesIndex = { v: string; updatedAt?: string; pages: Record<string, IndexEntry> };

const GROUPS = new Set(["enacted", "passed", "failed", "pending"]);
const KEY_RE = /^[A-Za-z0-9_]+$/;
const PID_RE = /^[a-z0-9_]{1,80}$/;

export function emptyIndex(): BillPagesIndex {
  return { v: BILL_PAGES_INDEX_VERSION, pages: {} };
}

// A stored page record (vote-actions-pages.ts BillPageRecord) → its index row.
export function entryFromRecord(rec: any, etag: string, groupOf: (st: string) => string): IndexEntry | null {
  const d = rec && rec.doc;
  if (!d || !d.s || !d.n) return null;
  const e: IndexEntry = { s: String(d.s), n: String(d.n) };
  if (d.t) e.t = String(d.t);
  if (d.st) { e.st = String(d.st); const g = groupOf(e.st); if (GROUPS.has(g)) e.g = g; }
  if (d.sl) e.sl = String(d.sl);
  if (d.c) e.c = String(d.c);
  const k = (Array.isArray(d.m) ? d.m : []).map((x: any) => x && x.k).filter((x: any) => typeof x === "string" && KEY_RE.test(x));
  if (k.length) e.k = [...new Set<string>(k)];
  const sp = (d.sp && Array.isArray(d.sp.s) ? d.sp.s : []).filter((x: any) => typeof x === "string" && PID_RE.test(x));
  if (sp.length) e.sp = [...new Set<string>(sp)];
  if (etag) e.e = etag;
  return e;
}

export interface IndexStore {
  list(opts: { prefix: string }): Promise<{ blobs: Array<{ key: string; etag?: string }> }>;
  get(key: string, opts: { type: "json" }): Promise<any>;
  setJSON(key: string, value: unknown): Promise<unknown>;
}

// Bring the index in line with the store: re-read pages whose etag moved, add
// pages it lacks, drop pages the store no longer holds. Bounded per run (`max`
// reads inside `budgetMs`), so a large backlog is worked off over several runs.
// Saved only when something changed. Never throws.
export async function refreshBillPagesIndex(
  store: IndexStore,
  { groupOf, max = 300, budgetMs = 20_000, now = () => new Date(), clock = () => Date.now(), log = (_l: string) => {} }:
    { groupOf: (st: string) => string; max?: number; budgetMs?: number; now?: () => Date; clock?: () => number; log?: (l: string) => void },
): Promise<{ read: number; dropped: number; pending: number; saved: boolean; total: number }> {
  const out = { read: 0, dropped: 0, pending: 0, saved: false, total: 0 };
  try {
    const start = clock();
    let index: BillPagesIndex | null = null;
    try { index = await store.get(BILL_PAGES_INDEX_KEY, { type: "json" }); } catch { index = null; }
    if (!index || index.v !== BILL_PAGES_INDEX_VERSION || !index.pages || typeof index.pages !== "object") index = emptyIndex();
    const listed = await store.list({ prefix: PAGE_PREFIX });
    const blobs = (listed && Array.isArray(listed.blobs) ? listed.blobs : []).filter((b) => b && typeof b.key === "string");
    const live = new Set(blobs.map((b) => b.key));
    let changed = false;
    for (const k of Object.keys(index.pages)) {
      if (!live.has(k)) { delete index.pages[k]; out.dropped++; changed = true; }
    }
    const todo = blobs.filter((b) => { const cur = index!.pages[b.key]; return !cur || (b.etag && cur.e !== b.etag); })
      .sort((a, b) => a.key.localeCompare(b.key));
    for (const b of todo) {
      if (out.read >= max || clock() - start > budgetMs) { out.pending++; continue; }
      let rec: any = null;
      try { rec = await store.get(b.key, { type: "json" }); } catch { rec = null; }
      out.read++;
      const e = rec ? entryFromRecord(rec, b.etag || "", groupOf) : null;
      if (e) { index.pages[b.key] = e; changed = true; }
      else if (index.pages[b.key]) { delete index.pages[b.key]; changed = true; }
    }
    out.total = Object.keys(index.pages).length;
    if (changed) {
      index.updatedAt = now().toISOString();
      await store.setJSON(BILL_PAGES_INDEX_KEY, index);
      out.saved = true;
    }
    log(`vote-actions: PAGE INDEX ${out.total} page(s) · read ${out.read} · dropped ${out.dropped}${out.pending ? ` · ${out.pending} left for the next run` : ""}`);
  } catch (e: any) {
    log(`vote-actions: PAGE INDEX not refreshed — ${String(e?.message || e).slice(0, 160)}`);
  }
  return out;
}

const norm = (n: string) => String(n || "").replace(/\s+/g, " ").trim();
const rowKey = (s: string, n: string) => `${String(s || "").trim()}|${norm(n)}`;
const entries = (index: BillPagesIndex | null) =>
  index && index.pages && typeof index.pages === "object"
    ? Object.keys(index.pages).sort().map((k) => index.pages[k]).filter((e) => e && e.s && e.n)
    : [];

// ── Site search: bill-search-index.js ───────────────────────────────────────
// The committed file is one `window.PDX_BILL_SEARCH = [` array of rows
// [sitting, number, title, status, chamber, issue keys]. The rows it holds are
// read back by pattern; one appended statement pushes the generated pages it
// does not hold, in the same row shape, so the eye finds them by number and title.
export function listedSearchRows(js: string): Set<string> {
  const out = new Set<string>();
  for (const m of js.matchAll(/^\s*\[\s*("(?:[^"\\]|\\.)*")\s*,\s*("(?:[^"\\]|\\.)*")/gm)) {
    try { out.add(rowKey(JSON.parse(m[1]), JSON.parse(m[2]))); } catch { /* not a row */ }
  }
  return out;
}
export function mergeSearchIndex(js: string, index: BillPagesIndex | null): { js: string; added: number } {
  const have = listedSearchRows(js);
  const rows: unknown[][] = [];
  for (const e of entries(index)) {
    const k = rowKey(e.s, e.n);
    if (have.has(k)) continue;
    have.add(k);
    rows.push([e.s, e.n, e.t || "", e.st || "", e.c || "", e.k || []]);
  }
  if (!rows.length) return { js, added: 0 };
  const tail =
    `// Added when served: bill pages the scheduled bill job generated after this\n` +
    `// file was written (Blobs "bill-pages", via its page index), same row shape.\n` +
    `window.PDX_BILL_SEARCH = (window.PDX_BILL_SEARCH || []).concat([\n` +
    rows.map((r) => "  " + JSON.stringify(r)).join(",\n") + `\n]);\n`;
  return { js: (js.endsWith("\n") ? js : js + "\n") + tail, added: rows.length };
}

// ── Person bill lists: person-bills.json ────────────────────────────────────
// { bills: [[sitting, number, title, status, group, label, issue keys]],
//   people: { pid: [[bill index, role]] } }. A generated page with a
// roster-linked sponsor adds its row and a [index, "s"] ref under that pid —
// the role its page gives them. A bill the committed table already lists is
// left exactly as it is, and a page with no status (no official record read)
// is not added: the list groups by outcome, and it has none to file under.
export function mergePersonBills(data: any, index: BillPagesIndex | null): { data: any; added: number } {
  if (!data || !Array.isArray(data.bills) || !data.people || typeof data.people !== "object") return { data, added: 0 };
  const list = entries(index).filter((e) => e.sp && e.sp.length && e.g && e.st);
  if (!list.length) return { data, added: 0 };
  const at = new Map<string, number>();
  data.bills.forEach((b: any, i: number) => { if (Array.isArray(b)) at.set(rowKey(b[0], b[1]), i); });
  const bills = data.bills.slice();
  const people: Record<string, any[]> = { ...data.people };
  let added = 0;
  for (const e of list) {
    const k = rowKey(e.s, e.n);
    if (at.has(k)) continue;
    const i = bills.length;
    bills.push([e.s, e.n, e.t || "", e.st, e.g, e.sl || "", e.k || []]);
    at.set(k, i);
    added++;
    for (const pid of e.sp!) {
      const refs = (people[pid] || []).slice();
      if (!refs.some((r: any) => r && r[0] === i)) refs.push([i, "s"]);
      people[pid] = refs;
    }
  }
  return { data: added ? { ...data, bills, people } : data, added };
}
