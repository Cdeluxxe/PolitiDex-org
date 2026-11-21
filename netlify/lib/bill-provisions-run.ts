// ─────────────────────────────────────────────────────────────────────────────
// Provisions generator — one run over the generated bill pages
// ─────────────────────────────────────────────────────────────────────────────
// Lists every generated bill page (Blobs "bill-pages", keys "us/<c>/<number>"),
// skips any address the hand-built snapshot (db/bill-docs.json) holds, picks
// each page's source (bill-provisions-core.ts pickSource), and — for a page with
// no current section — asks the model for plain-language points, checks them,
// and stores the record in Blobs "bill-provisions" under the page's own key.
// A page with no usable source gets an "unavailable" record with its reason, so
// the run report can say which bills still have no section and why.
//
// Progress lives in one state doc ("state/v1": key → sig / status / attempts),
// so a run reads one blob, not one per page. A page is redone only when its
// source changes (a late CRS summary) or the prompt version moves.
//
// Injected deps only (stores, bill lookup, model call, clock) so
// scripts/test-bill-provisions.mjs runs it with no network and no database.

import {
  PROVISIONS_VERSION, MAX_ATTEMPTS, PROVISIONS_MODEL, type ProvisionInput, type ProvisionsRecord, type SourceKind,
  pickSource, provisionsSignature, provisionsKey, buildUserPrompt, SYSTEM_PROMPT, parseModelJson, checkPoints,
  okRecord, unavailableRecord, priorityOf,
} from "./bill-provisions-core.ts";

export type ProvisionsStore = {
  get(key: string, opts: { type: "json" }): Promise<any>;
  setJSON(key: string, value: unknown): Promise<unknown>;
  list(opts: { prefix: string }): Promise<{ blobs: Array<{ key: string }> }>;
};
export type ProvisionsState = { v: string; pages: Record<string, { sig: string; status: string; at: string; attempts?: number; reason?: string; points?: number; kind?: string }>; lastRun?: any };
export type ProvisionsDeps = {
  pageKeys: string[];                                  // "us/<c>/<encoded number>"
  handBuilt: Set<string>;                              // "<sitting>|<number>"
  inputs: (wanted: Array<{ congress: number; number: string }>) => Promise<Map<string, ProvisionInput & { billKey?: string; hasMeasureRecord?: boolean }>>;
  summaryVersion?: (inp: ProvisionInput & { billKey?: string; rawRef?: string | null }) => Promise<string | null>;
  generate: (system: string, user: string) => Promise<string>;
  store: ProvisionsStore;
  state: ProvisionsState | null;
  now?: () => Date;
  clock?: () => number;
  budgetMs?: number;
  maxPerRun?: number;
  log?: (l: string) => void;
};
export type ProvisionsReport = {
  pages: number; handBuilt: number; current: number; generated: number; unavailable: number; failed: number;
  pending: number; budgetHit: boolean; withSection: number; reasons: Record<string, number>;
};

export function parsePageKey(key: string): { congress: number; number: string } | null {
  const m = /^us\/(\d{1,3})\/(.+)$/.exec(key);
  if (!m) return null;
  try { return { congress: Number(m[1]), number: decodeURIComponent(m[2]) }; } catch { return null; }
}

export async function runProvisions(deps: ProvisionsDeps): Promise<{ report: ProvisionsReport; state: ProvisionsState }> {
  const log = deps.log || ((l: string) => console.log(l));
  const now = deps.now || (() => new Date());
  const clock = deps.clock || (() => Date.now());
  const started = clock();
  const budget = deps.budgetMs ?? 11 * 60_000;
  const maxPerRun = deps.maxPerRun ?? 60;
  const state: ProvisionsState = deps.state && deps.state.v === PROVISIONS_VERSION && deps.state.pages ? deps.state : { v: PROVISIONS_VERSION, pages: {} };
  const report: ProvisionsReport = { pages: 0, handBuilt: 0, current: 0, generated: 0, unavailable: 0, failed: 0, pending: 0, budgetHit: false, withSection: 0, reasons: {} };

  const wanted: Array<{ congress: number; number: string; key: string }> = [];
  for (const key of deps.pageKeys) {
    const p = parsePageKey(key);
    if (!p) continue;
    report.pages++;
    // HAND-BUILT PAGES ARE NEVER TOUCHED: the snapshot serves those addresses.
    if (deps.handBuilt.has(`${p.congress}|${p.number}`)) { report.handBuilt++; continue; }
    wanted.push({ ...p, key: provisionsKey(p.congress, p.number) });
  }
  const inputs = await deps.inputs(wanted);

  type Job = { key: string; inp: ProvisionInput & { billKey?: string; hasMeasureRecord?: boolean; rawRef?: string | null }; prio: number };
  const jobs: Job[] = [];
  for (const w of wanted) {
    const inp = inputs.get(`${w.congress}|${w.number}`);
    const prev = state.pages[w.key];
    if (!inp) {
      // A page whose bill row is gone: nothing to read it from.
      const reason = "no stored bill record to read the text from";
      const sig = provisionsSignature(null, reason);
      if (prev?.sig !== sig) {
        await deps.store.setJSON(w.key, unavailableRecord({ congress: w.congress, number: w.number, measureType: "", title: "" }, reason, now()));
        state.pages[w.key] = { sig, status: "unavailable", at: now().toISOString(), reason };
      }
      continue;
    }
    // The summary version label is part of the source label, not its text, so
    // the signature is computed from the text alone.
    const picked = pickSource(inp);
    const sig = "source" in picked ? provisionsSignature(picked.source) : provisionsSignature(null, picked.reason);
    if (prev && prev.sig === sig && (prev.status !== "failed" || (prev.attempts || 0) >= MAX_ATTEMPTS)) { continue; }
    if (!("source" in picked)) {
      await deps.store.setJSON(w.key, unavailableRecord({ ...inp }, picked.reason, now()));
      state.pages[w.key] = { sig, status: "unavailable", at: now().toISOString(), reason: picked.reason };
      continue;
    }
    jobs.push({ key: w.key, inp, prio: priorityOf(picked.source.kind, !!inp.hasMeasureRecord) });
  }
  jobs.sort((a, b) => a.prio - b.prio || b.inp.congress - a.inp.congress || a.key.localeCompare(b.key));

  let done = 0;
  for (const job of jobs) {
    if (done >= maxPerRun) { report.pending++; continue; }
    if (clock() - started > budget) { report.budgetHit = true; report.pending++; continue; }
    done++;
    const inp = { ...job.inp };
    if (deps.summaryVersion && inp.measureType !== "amendment") {
      try { inp.summaryVersion = (await deps.summaryVersion(inp)) || null; } catch { inp.summaryVersion = null; }
    }
    const picked = pickSource(inp);
    if (!("source" in picked)) continue;
    const src = picked.source;
    const sig = provisionsSignature(src);
    const prev = state.pages[job.key];
    const attempts = (prev?.sig === sig && prev.status === "failed" ? prev.attempts || 0 : 0) + 1;
    try {
      const user = buildUserPrompt(inp, src);
      let raw = await deps.generate(SYSTEM_PROMPT, user);
      let checked = checkPoints(parseModelJson(raw) || [], src);
      // One second try when the check dropped any point (a duplicate aside),
      // with the reasons; the answer with more surviving points is used.
      if (!checked.items.length || checked.dropped.some((d) => d.why !== "duplicate")) {
        const why = checked.dropped.map((d) => `- "${d.text}" was rejected: ${d.why}`).join("\n") || "- the reply was not valid JSON";
        raw = await deps.generate(SYSTEM_PROMPT, `${user}\n\nSome points in your previous answer could not be used:\n${why}\nTry again with every point. Use shorter, simpler sentences (split a long point into two short sentences), and copy \`from\` exactly from the source.`);
        const second = checkPoints(parseModelJson(raw) || [], src);
        if (second.items.length > checked.items.length) checked = second;
      }
      if (!checked.items.length) throw new Error(`no point passed the check (${checked.dropped.map((d) => d.why).join("; ") || "unparseable reply"})`);
      const rec = okRecord(inp, src, checked.items, now(), PROVISIONS_MODEL);
      await deps.store.setJSON(job.key, rec);
      state.pages[job.key] = { sig, status: "ok", at: rec.generatedAt, points: checked.items.length, kind: src.kind };
      report.generated++;
      log(`bill-provisions: OK ${job.key} — ${checked.items.length} point(s) from ${src.kind}${checked.dropped.length ? ` · dropped ${checked.dropped.length} (${checked.dropped.map((d) => d.why).join(", ")})` : ""}`);
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 200);
      state.pages[job.key] = { sig, status: "failed", at: now().toISOString(), attempts, reason: msg };
      report.failed++;
      log(`bill-provisions: ${attempts >= MAX_ATTEMPTS ? "GAVE UP" : "RETRY LATER"} ${job.key} — ${msg} (attempt ${attempts})`);
    }
  }

  for (const w of wanted) {
    const e = state.pages[w.key];
    if (!e) continue;
    if (e.status === "ok") report.withSection++;
    else if (e.status === "unavailable") { report.unavailable++; report.reasons[e.reason || "?"] = (report.reasons[e.reason || "?"] || 0) + 1; }
  }
  report.current = report.withSection;
  state.lastRun = { at: now().toISOString(), ms: clock() - started, ...report };
  return { report, state };
}

export function provisionsSummaryLine(r: ProvisionsReport): string {
  const reasons = Object.entries(r.reasons).map(([k, n]) => `${n}× ${k}`).join("; ");
  return `bill-provisions: run — pages ${r.pages} (hand-built skipped ${r.handBuilt}) · with a section ${r.withSection} · new ${r.generated} · failed ${r.failed} · still queued ${r.pending}${r.budgetHit ? " (budget reached)" : ""} · no source ${r.unavailable}${reasons ? ` [${reasons}]` : ""}`;
}

export type { ProvisionsRecord, SourceKind };
