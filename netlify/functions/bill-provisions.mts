// ─────────────────────────────────────────────────────────────────────────────
// Provisions generator — background worker
// ─────────────────────────────────────────────────────────────────────────────
// Gives each generated bill page a plain-language "What this bill does" section
// (see netlify/lib/bill-provisions-core.ts for the source order and the checks,
// netlify/lib/bill-provisions-run.ts for the run). A BACKGROUND function: one
// model call per bill, ~60 bills a run, far past a scheduled function's 30 s.
// Woken every 30 minutes by bill-provisions-cron.mts; a worker lock in the store
// turns an overlapping wake into a no-op.
//
// Reads: Blobs "bill-pages" (the list of generated pages), the stored CRS
// summary / amendment purpose of each bill (pdx_action_bills, read-only through
// vr-vote-source-db.ts loadActionBillTexts), vr_measures (the measure record's
// summary), Blobs "raw-ingest-votes" (which version the CRS summary describes).
// Writes ONLY Blobs "bill-provisions". No score, stance, Evidence Locker or
// video record is read or written. Hand-built pages (db/bill-docs.json) are
// skipped.
//   BILL_PROVISIONS_DISABLED=1 — turn the generator off without a deploy
import type { Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import { and, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { vrMeasures } from "../../db/schema.js";
import { loadActionBillTexts } from "../lib/vr-vote-source-db.js";
import { BILL_PAGES_STORE_NAME } from "../lib/vote-actions-pages.js";
import { RAW_VOTES_STORE_NAME } from "../lib/vote-actions-core.js";
import { PROVISIONS_STORE_NAME, PROVISIONS_STATE_KEY, PROVISIONS_LOCK_KEY, PROVISIONS_MODEL, type ProvisionInput } from "../lib/bill-provisions-core.ts";
import { runProvisions, provisionsSummaryLine } from "../lib/bill-provisions-run.ts";
import billDocsFile from "../../db/bill-docs.json" with { type: "json" };

const HAND_BUILT = new Set(Object.keys((billDocsFile as any).docs || {}));
const LOCK_MS = 15 * 60_000;

async function listAll(store: any, prefix: string): Promise<string[]> {
  const res = await store.list({ prefix });
  return (res?.blobs || []).map((b: { key: string }) => b.key);
}

async function loadInputs(wanted: Array<{ congress: number; number: string }>) {
  const out = new Map<string, ProvisionInput & { billKey?: string; hasMeasureRecord?: boolean; rawRef?: string | null }>();
  if (!wanted.length) return out;
  const congresses = [...new Set(wanted.map((w) => w.congress))];
  const numbers = [...new Set(wanted.map((w) => w.number))];
  const rows = await loadActionBillTexts(congresses, numbers);
  const measures = await db.select({
    congress: vrMeasures.congress, number: vrMeasures.number, summary: vrMeasures.summary, sourceUrl: vrMeasures.sourceUrl,
  }).from(vrMeasures).where(and(inArray(vrMeasures.congress, congresses), inArray(vrMeasures.number, numbers), sql`length(coalesce(${vrMeasures.summary}, '')) > 0`));
  const byMeasure = new Map<string, { summary: string; sourceUrl: string }>();
  for (const m of measures) {
    const k = `${m.congress}|${m.number}`;
    const prev = byMeasure.get(k);
    if (!prev || String(m.summary || "").length > prev.summary.length) byMeasure.set(k, { summary: String(m.summary || ""), sourceUrl: m.sourceUrl });
  }
  for (const r of rows) {
    if (r.congress == null || !r.number) continue;
    const k = `${r.congress}|${r.number}`;
    const m = byMeasure.get(k);
    out.set(k, {
      billKey: r.billKey, congress: r.congress, number: r.number, measureType: r.measureType, title: r.title,
      summary: r.summary, sourceUrl: r.sourceUrl, metaSource: r.metaSource, rawRef: r.rawRef,
      measureSummary: m?.summary || null, measureSourceUrl: m?.sourceUrl || null, hasMeasureRecord: !!m,
    });
  }
  return out;
}

// Which version of the bill the CRS summary describes ("Introduced in House,
// Jun 12, 2025"), read from the unmodified Congress.gov payload the vote-actions
// job stored. Best effort: no payload, no label.
async function summaryVersionFrom(rawStore: any, rawRef: string | null | undefined): Promise<string | null> {
  if (!rawStore || !rawRef) return null;
  const env = await rawStore.get(rawRef, { type: "json" });
  const part = (env?.responses || []).find((x: any) => x.part === "summaries" && x.body);
  if (!part) return null;
  const sums: any[] = JSON.parse(part.body)?.summaries || [];
  sums.sort((x, y) => String(y.updateDate || y.actionDate).localeCompare(String(x.updateDate || x.actionDate)));
  const s = sums[0];
  if (!s?.actionDesc) return null;
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s.actionDate || ""));
  const M = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  return `${String(s.actionDesc).trim()}${d ? `, ${M[Number(d[2]) - 1]} ${Number(d[3])}, ${d[1]}` : ""}`;
}

export default async (): Promise<void> => {
  if (process.env.BILL_PROVISIONS_DISABLED === "1") { console.log("bill-provisions: disabled (BILL_PROVISIONS_DISABLED=1) — no-op."); return; }
  const store = getStore({ name: PROVISIONS_STORE_NAME, consistency: "strong" });
  // The worker lock: one run at a time.
  try {
    const lock: any = await store.get(PROVISIONS_LOCK_KEY, { type: "json" });
    if (lock?.at && Date.now() - Number(lock.at) < LOCK_MS) { console.log("bill-provisions: another run holds the lock — nothing to do"); return; }
    await store.setJSON(PROVISIONS_LOCK_KEY, { at: Date.now() });
  } catch (e: any) { console.log(`bill-provisions: lock unavailable — ${e?.message || e}`); return; }

  try {
    const pageKeys = await listAll(getStore(BILL_PAGES_STORE_NAME), "us/");
    let state: any = null;
    try { state = await store.get(PROVISIONS_STATE_KEY, { type: "json" }); } catch { state = null; }
    let rawStore: any = null;
    try { rawStore = getStore(RAW_VOTES_STORE_NAME); } catch { rawStore = null; }
    const anthropic = new Anthropic();

    const { report, state: next } = await runProvisions({
      pageKeys,
      handBuilt: HAND_BUILT,
      inputs: loadInputs,
      summaryVersion: (inp: any) => summaryVersionFrom(rawStore, inp.rawRef),
      generate: async (system, user) => {
        const msg = await anthropic.messages.create({
          model: PROVISIONS_MODEL,
          max_tokens: 1500,
          system,
          messages: [{ role: "user", content: user }],
        });
        return msg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      },
      store: store as any,
      state,
    });
    await store.setJSON(PROVISIONS_STATE_KEY, next);
    console.log(provisionsSummaryLine(report));
  } catch (e: any) {
    console.log(`bill-provisions: run failed — ${e?.message || e}`);
  } finally {
    try { await store.delete(PROVISIONS_LOCK_KEY); } catch { /* the lock expires on its own */ }
  }
};

export const config: Config = {
  background: true,
};
