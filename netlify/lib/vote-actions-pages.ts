// ─────────────────────────────────────────────────────────────────────────────
// Action layer — the public bill page for a bill the vote-actions job wrote
// ─────────────────────────────────────────────────────────────────────────────
// A bill the job tags and stores votes for gets a page at the address every bill
// page already lives at, /b/<congress>/<number>, rendered by the SAME template
// (bill.html, filled by share-preview.ts through share-target.ts). This module
// builds the record that template reads: the exact shape of one entry in
// db/bill-docs.json (scripts/gen-bill-docs.mjs), so the page prints the same
// blocks a snapshot bill prints:
//   s / n / c / t   sitting, number, chamber of origin, the stored title
//   m               the related issues — the bill's HIGH-tier topic tags, keys
//                   only; share-target.ts labels them from the share index the
//                   way it labels the live mapping table, and drops a key with
//                   no label. No effect line: the tagger writes none.
//   st / sl         status, derived from the official actions by the same
//                   deriveStatus / statusLabel the snapshot uses
//   o / sp / su / h origin, roster-linked sponsors (bioguide → roster through the
//                   member map), the count of others, and the key actions
//   rs              the Congress.gov record page
// The actions are read with the same classifier as scripts/fetch-bill-record.mjs
// (bill-record-stages.mjs). Without a Congress.gov key the page carries identity,
// title and issues only — no status or history is guessed.
//
// Pure: no database, no Blobs, no network. The run (vote-actions-core.ts) fetches
// and stores; this only turns data into the record.

import { billStage, amendmentStage, pickActions, chamberOf, day } from "./bill-record-stages.mjs";
import { deriveStatus, statusLabel, historyRows } from "../../scripts/bill-record-core.mjs";

export const BILL_PAGES_STORE_NAME = "bill-pages";
export const PAGE_VERSION = "va-page-v1";
export const PAGES_PER_RUN = 12;            // page builds per run (each may fetch the action list)
export const PAGE_REFRESH_DAYS = 7;         // a sitting Congress's pages are rebuilt this often (status moves)
export const PAGE_MAX_ATTEMPTS = 6;

// The fields of a stored bill row the page reads.
export type PageBill = {
  billKey: string; congress: number; measureType: string; billType: string; number: string | null;
  title: string; topicTags: string[]; tagDetail: Array<{ key: string; impactTier?: string }>;
  taggerVersion: string; hasSummary: boolean; sourceUrl: string; rawRef?: string | null;
};

// db/bill-docs.json's per-bill shape (share-target.ts BillDocRec), keys only in m.
export type BillPageDoc = {
  s: string; n: string; c?: string; t?: string; m?: { k: string }[];
  st?: string; sl?: string; o?: { c?: string; d?: string };
  sp?: { s?: string[]; c?: string[] }; su?: { s?: number; c?: number };
  h?: { d: string; a: string; x: string }[]; rs?: string;
};
export type BillPageRecord = {
  v: string; billKey: string; url: string; generatedAt: string; sig: string; doc: BillPageDoc;
};

// Blob key and public address. The number is spelled as the row prints it
// ("H.R. 5000"), the same spelling share-target.ts looks up.
export const pageStoreKey = (congress: number | string, number: string) => `us/${congress}/${encodeURIComponent(number)}`;
export const billPageUrl = (congress: number | string, number: string) =>
  `/b/${encodeURIComponent(String(congress))}/${encodeURIComponent(number)}`;
// "<sitting>|<number>", the db/bill-docs.json key.
export const docKey = (congress: number | string, number: string) => `${congress}|${String(number).replace(/\s+/g, " ").trim()}`;

// A nomination has no bill page from this job (the snapshot files those under a
// short label), and a measure with no citation has no address.
export const wantsPage = (b: { measureType: string; number: string | null }) => b.measureType !== "nomination" && !!b.number;

// What the page depends on. A different signature = the page is rebuilt.
// `keyed` records whether the official record could be read at all.
export function pageSignature(b: PageBill, keyed: boolean): string {
  return [PAGE_VERSION, b.taggerVersion, highTags(b).join(","), b.title, b.hasSummary ? 1 : 0, keyed ? "k" : "-"].join("|");
}

export function highTags(b: Pick<PageBill, "topicTags" | "tagDetail">): string[] {
  const tiers = new Map((b.tagDetail || []).map((d) => [d.key, d.impactTier]));
  return (b.topicTags || []).filter((k) => tiers.get(k) !== "low").sort();
}

// The day a Congress ended (noon Jan 3 of the odd year after it), when that day
// has passed; null for a sitting Congress.
export function congressEndedOn(congress: number, now: Date): string | null {
  const end = `${1789 + 2 * congress}-01-03`;
  return new Date(`${end}T17:00:00Z`).getTime() <= now.getTime() ? end : null;
}

// Congress.gov bill / amendment JSON + action list → the official record, in
// db/bill-record.json's shape ({ src, ch, in, a }). Null when there is no record.
export function recordFrom(b: PageBill, main: any, actions: any[] | null): { src: string; ch: string; in: string; a: any[] } | null {
  if (!main) return null;
  const amendment = b.measureType === "amendment";
  if (amendment) {
    const ch = chamberOf(main.chamber || (b.billType.startsWith("h") ? "house" : "senate"));
    const a = pickActions(actions || [], amendmentStage).map((x: any) => ({ ...x, c: ch }));
    const when = day(main.submittedDate || main.proposedDate || ((actions || [])[(actions || []).length - 1] || {}).actionDate);
    return {
      src: b.sourceUrl, ch, in: when,
      a: a.map((x: any, i: number) => ({ x, i }))
        .sort((p: any, q: any) => p.x.d.localeCompare(q.x.d) || (p.x.s === "offered" ? -1 : 0) - (q.x.s === "offered" ? -1 : 0) || p.i - q.i)
        .map((o: any) => o.x),
    };
  }
  const acts = (actions || []).filter((a: any) => !a.sourceSystem || String(a.sourceSystem.code) === "9" || a.sourceSystem.name === "Senate");
  return { src: b.sourceUrl, ch: chamberOf(main.originChamber), in: day(main.introducedDate), a: pickActions(acts, billStage) };
}

// The page record. `main` is the Congress.gov bill (or amendment) object, and
// `actions` its action list — both null without a key or on a failed read.
export function buildBillPage(
  b: PageBill,
  src: { main?: any; actions?: any[] | null; keyed: boolean },
  memberMap: Record<string, string>,
  now: Date,
): BillPageRecord {
  const sitting = String(b.congress);
  const number = String(b.number);
  const rec = recordFrom(b, src.main || null, src.actions ?? null);
  const doc: BillPageDoc = { s: sitting, n: number, c: rec?.ch || chamberOf(b.billType.startsWith("h") ? "house" : "senate"), t: String(b.title || "").trim() };
  const keys = highTags(b);
  if (keys.length) doc.m = keys.map((k) => ({ k }));
  if (rec) {
    const ended = congressEndedOn(b.congress, now) || undefined;
    const status = deriveStatus(sitting, number, rec, ended);
    doc.st = status.st;
    doc.sl = statusLabel(status.st, status.why, sitting);
    doc.o = { c: rec.ch || "", d: rec.in || "" };
    // Sponsors: only people the member map links to a roster file are named;
    // the rest of the record's list is counted, never named.
    const linked: string[] = [];
    let unlinkedSponsors = 0;
    for (const p of Array.isArray(src.main?.sponsors) ? src.main.sponsors : []) {
      const pid = memberMap[String(p?.bioguideId || "")];
      if (pid && !linked.includes(pid)) linked.push(pid); else unlinkedSponsors++;
    }
    if (linked.length) doc.sp = { s: linked };
    const cos = Number(src.main?.cosponsors?.count ?? src.main?.cosponsors?.countIncludingWithdrawnCosponsors ?? 0) || 0;
    const su: { s?: number; c?: number } = {};
    if (unlinkedSponsors) su.s = unlinkedSponsors;
    if (cos) su.c = cos;
    if (Object.keys(su).length) doc.su = su;
    doc.h = historyRows(sitting, number, rec, status, ended).map(({ d, a, x }: any) => ({ d, a, x }));
  }
  if (/^https:\/\/www\.congress\.gov\//.test(b.sourceUrl)) doc.rs = b.sourceUrl;
  return {
    v: PAGE_VERSION, billKey: b.billKey, url: billPageUrl(sitting, number), generatedAt: now.toISOString(),
    sig: pageSignature(b, src.keyed), doc,
  };
}
