// ─────────────────────────────────────────────────────────────────────────────
// congress-sync-core.mjs — the three scheduled pulls (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────
// Three jobs, each run by its own scheduled function:
//
//   bill-record      netlify/functions/congress-sync-bill-record.mts
//                    Congress.gov → db/bill-record.json (federal entries; the
//                    Utah entries are carried over from the committed file)
//   cosponsorships   netlify/functions/congress-sync-cosponsorships.mts
//                    Congress.gov → db/cosponsorship-source.json, and its
//                    derived db/cosponsorships.json
//   committees       netlify/functions/congress-sync-committees.mts
//                    the House Clerk's MemberData.xml + the Senate LIS
//                    cvc_member_data.xml (the files gen-committees.mjs reads;
//                    Congress.gov publishes no member→committee list) →
//                    db/committee-source.json and db/person-committees.json
//
// WHY BLOBS AND NOT db/. A deployed function has no checkout of the repo and
// cannot commit, so a job cannot rewrite a committed file. Each job writes the
// file it would have written, byte for byte as the generator writes it, to the
// "congress-sync" Netlify Blobs store under files/<repo path>. Then:
//   · /api/person-coverage, /api/bill-cosponsors and /committee/<code> read the
//     live derived files (congress-sync-live.mjs) and fall back to the
//     committed ones;
//   · scripts/sync-congress-snapshots.mjs copies the source files into db/ and
//     reruns the generators, so a commit brings the bill pages and the sitemap
//     up to date.
//
// A PASS, IN SLICES. A scheduled function gets 30 seconds; the co-sponsor pull
// is ~550 members and the bill record ~200 measures, several reads each. So a
// job runs as a daily PASS worked off over several invocations inside its
// window: each invocation reads as many units as fit in its budget, saves what
// it read to state/<job> (staging only — nothing a reader sees), and the
// invocation that reads the last unit builds the files, checks them and
// publishes them. Then the pass is done for the UTC day, and later invocations
// that day only log that it is current.
//
// WRITE NOTHING ON FAILURE. Any API error, a non-JSON answer, an answer
// missing the list it should carry, a record that disappeared, or a short read
// fails the PASS: the staged reads are dropped, nothing under files/ changes,
// the invocation logs FAIL and returns 502. The next invocation starts a fresh
// pass. A unit cut off by the time budget is not a failure — it is read again
// by the next slice.
//
// IDEMPOTENT. A pass reads everything again from the source; its files are
// rendered deterministically (sorted keys, the generators' own renderers), so
// two passes over unchanged data publish identical bytes. Re-running a done
// pass is a no-op.
// ─────────────────────────────────────────────────────────────────────────────
import { parseHouse, parseSenate, sourceFrom, derive as deriveCommittees, render as renderCommittees, HOUSE_URL, SENATE_URL } from "../../scripts/gen-committees.mjs";
import { rowOf, derive as deriveCosponsorships } from "../../scripts/gen-cosponsorships.mjs";
import { federalReader, isFederalTarget, isUtahKey, renderBillRecord } from "./bill-record-federal.mjs";

export const STORE_NAME = "congress-sync";
export const API = "https://api.congress.gov/v3";
export const JOBS = ["bill-record", "cosponsorships", "committees"];

// Schedules, UTC. Each job has its own hour so the two Congress.gov pulls never
// share the key's hourly allowance, and all three finish before the 07:00
// voting-record ingest and the 09:17 generator-freshness run. A window of
// every-10-minutes slices gives a pass 6 invocations (a full pass measured at
// 2–3); a done pass makes the rest a few-millisecond no-op. 13 invocations a
// day for the three, ~400 a month.
export const SCHEDULES = {
  committees: "40 4 * * *",
  "bill-record": "*/10 5 * * *",
  cosponsorships: "*/10 6 * * *",
};

// The key the Congress.gov jobs read. Netlify carries it as
// CONGRESS_GOV_API_KEY (the name the CLI generators and the voting-record
// ingest already use); CONGRESS_API_KEY is accepted as an alias.
export const apiKey = (env = process.env) => String(env.CONGRESS_GOV_API_KEY || env.CONGRESS_API_KEY || "").trim();

export const fileKey = (repoPath) => `files/${repoPath}`;
export const stateKey = (job) => `state/${job}`;

// A unit cut off by the slice budget: read again next slice, not a failure.
export class Deferred extends Error { constructor(m) { super(m); this.name = "Deferred"; } }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const redact = (s) => String(s).replace(/api_key=[^&\s]+/g, "api_key=…");

// ── HTTP, deadline-aware ────────────────────────────────────────────────────
// get(url) → parsed JSON | null (404). Throws on any other non-2xx after
// retrying 429/5xx, on a non-JSON body, and on a timeout. Throws Deferred when
// the slice's hard deadline would be passed.
export function httpClient({ fetch: f = globalThis.fetch, now = Date.now, deadline, perRequestMs = 8000, retries = 2, text = false, headers = {} }) {
  return async function get(url) {
    for (let attempt = 0; ; attempt++) {
      const left = deadline - now();
      if (left < 1500) throw new Deferred("slice budget spent");
      let res;
      try {
        res = await f(url, { headers: { accept: text ? "application/xml,text/xml,*/*" : "application/json", ...headers }, signal: AbortSignal.timeout(Math.min(perRequestMs, left - 500)) });
      } catch (e) {
        if (deadline - now() < 1500) throw new Deferred("slice budget spent");
        if (attempt < retries) { await sleep(800 * (attempt + 1)); continue; }
        throw new Error(`${redact(url)}: ${e?.name === "TimeoutError" ? "timed out" : "network error"}`);
      }
      if (res.status === 404) return null;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`${redact(url)}: HTTP ${res.status}`);
      const body = await res.text();
      if (text) return body;
      try { return JSON.parse(body); } catch { throw new Error(`${redact(url)}: answer is not JSON`); }
    }
  };
}

// api.congress.gov/v3 `path` (+ `&offset=…`) → JSON | null.
export function congressGet(get, key) {
  return (p, _cacheName, extra = "") => get(`${API}/${p}?format=json&limit=250${extra || ""}&api_key=${encodeURIComponent(key)}`);
}

// ── The bridge every coverage table uses ────────────────────────────────────
// bioguide → roster id, from db/vr-member-map.json, kept only where the roster
// id is a roster record. The roster here is db/share-index.json's people
// (gen-share-index.mjs writes one entry per cmp-data.js record), so the
// deployed function need not evaluate cmp-data.js; test-congress-sync.mjs
// checks that this equals coverage-core.mjs's bioguideMap.
export function bioguideMapFrom(memberMap, shareIndex) {
  const roster = shareIndex?.people || {};
  const out = new Map();
  for (const [bg, pid] of Object.entries(memberMap?.map || {})) {
    if (/^[A-Z]\d{6}$/.test(bg) && Object.prototype.hasOwnProperty.call(roster, pid)) out.set(bg, pid);
  }
  return out;
}

// ── Job definitions ─────────────────────────────────────────────────────────
// Each job: needsKey; units(inputs) → string[]; read(unit, ctx) → JSON-able;
// build(results, inputs, today) → { files: { repoPath: text }, summary }.
// build throws when the result is not something the generators can read.

// One member's co-sponsored measures in `congress`, as gen-cosponsorships.mjs
// --fetch reads them, but strict: an answer without the list is an error.
export async function memberCosponsored(cg, bg, congress) {
  const out = [];
  for (let offset = 0; offset < 20000; offset += 250) {
    const j = await cg(`member/${bg}/cosponsored-legislation`, "", `&offset=${offset}`);
    if (j === null) return out; // the member has no list
    if (!j || !Array.isArray(j.cosponsoredLegislation)) throw new Error(`member ${bg}: answer has no cosponsoredLegislation list`);
    const list = j.cosponsoredLegislation;
    let here = 0;
    for (const x of list) { const r = rowOf(x, congress); if (r) { out.push(r); here++; } }
    const newer = list.some((x) => Number(x.congress) > congress);
    if (list.length < 250 || (!here && !newer)) break;
  }
  return out;
}

const pretty = (o) => JSON.stringify(o, null, 1) + "\n";
const line = (o) => JSON.stringify(o) + "\n";
const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export const JOB_DEFS = {
  // Inputs: { billDocs, billRecord }  (db/bill-docs.json, db/bill-record.json)
  "bill-record": {
    needsKey: true,
    concurrency: 6,
    units: ({ billDocs }) => Object.keys(billDocs?.docs || {})
      .filter((k) => { const [s, ...n] = k.split("|"); return isFederalTarget(s, n.join("|")); })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    async read(unit, { cg }) {
      const [sitting, ...rest] = unit.split("|");
      return federalReader(cg, { strict: true })({ sitting, number: rest.join("|") });
    },
    build(results, { billRecord }, today) {
      const prior = billRecord?.records || {};
      if (!Object.keys(prior).length) throw new Error("the committed db/bill-record.json has no records to build on");
      const records = {};
      // Utah entries come from le.utah.gov, which this job does not read.
      for (const [k, v] of Object.entries(prior)) if (isUtahKey(k)) records[k] = v;
      const lost = [];
      for (const [k, r] of Object.entries(results)) {
        if (r) records[k] = r;
        else if (prior[k]) lost.push(k);
      }
      // A measure the committed file has a record for cannot stop having one.
      if (lost.length) throw new Error(`Congress.gov returned no record for ${lost.length} measure(s) on file: ${lost.slice(0, 5).join(", ")}`);
      for (const [k, r] of Object.entries(records)) {
        if (!r || typeof r.src !== "string" || !Array.isArray(r.sp) || !Array.isArray(r.a)) throw new Error(`record ${k} is not in the bill-record shape`);
      }
      const federal = Object.keys(results).filter((k) => results[k]).length;
      return { files: { "db/bill-record.json": renderBillRecord(records, today) }, summary: `${federal} federal records (+${Object.keys(records).length - federal} Utah carried over)` };
    },
  },

  // Inputs: { memberMap, shareIndex, billDocs, cosponsorshipSource }
  cosponsorships: {
    needsKey: true,
    concurrency: 8,
    units: ({ memberMap, shareIndex }) => [...bioguideMapFrom(memberMap, shareIndex).keys()].sort(),
    async read(unit, { cg, inputs }) {
      return memberCosponsored(cg, unit, congressOf(inputs));
    },
    build(results, inputs, today) {
      const congress = congressOf(inputs);
      const bgs = Object.keys(results);
      const bills = {};
      const members = {};
      for (const bg of bgs.sort()) {
        const rows = results[bg] || [];
        if (!rows.length) continue;
        members[bg] = [...new Set(rows.map((r) => r[0]))].sort();
        for (const [k, rec] of rows) if (!bills[k]) bills[k] = rec;
      }
      // The committed file has rows for ~535 members; a pass that finds a
      // fraction of that is a broken read, not a quiet Congress.
      const before = Object.keys(inputs.cosponsorshipSource?.members || {}).length;
      if (Object.keys(members).length < Math.max(1, Math.floor(before * 0.8))) throw new Error(`short read: ${Object.keys(members).length} members with co-sponsorships (committed file has ${before})`);
      const source = sortKeys({
        _comment: `WRITTEN by scripts/gen-cosponsorships.mjs --fetch from Congress.gov (GET /v3/member/<bioguide>/cosponsored-legislation) — do not edit by hand. The ${ord(congress)} Congress only. bills: "<congress>|<citation>" → [title, date introduced, policy area, Congress.gov page], all as Congress.gov lists them; members: bioguide id → the bills that member co-sponsored.`,
        congress, fetchedOn: today, source: "https://api.congress.gov/v3/member/{bioguideId}/cosponsored-legislation",
        bills, members,
      });
      const bgMap = bioguideMapFrom(inputs.memberMap, inputs.shareIndex);
      const pages = new Set(Object.keys(inputs.billDocs?.docs || {}));
      const names = {};
      for (const [pid, v] of Object.entries(inputs.shareIndex?.people || {})) if (v && v.n) names[pid] = v.n;
      const out = deriveCosponsorships(source, bgMap, { pages, names });
      return {
        files: { "db/cosponsorship-source.json": line(source), "db/cosponsorships.json": line(out) },
        summary: `${Object.keys(out.people).length} roster members, ${out.bills.length} co-sponsored measures`,
      };
    },
  },

  // Inputs: { memberMap, shareIndex }
  committees: {
    needsKey: false,
    concurrency: 2,
    units: () => ["house", "senate"],
    async read(unit, { getText }) {
      const xml = await getText(unit === "house" ? HOUSE_URL : SENATE_URL);
      if (xml === null) throw new Error(`${unit === "house" ? HOUSE_URL : SENATE_URL}: HTTP 404`);
      const parsed = unit === "house" ? parseHouse(xml) : parseSenate(xml);
      const n = Object.keys(parsed.members).length;
      // The same guard gen-committees.mjs --fetch applies.
      if (n < (unit === "house" ? 400 : 90)) throw new Error(`refusing a short read: ${n} ${unit === "house" ? "House" : "Senate"} members`);
      return parsed;
    },
    build(results, inputs, today) {
      if (!results.house || !results.senate) throw new Error("both chamber files are required");
      const source = sourceFrom(results.house, results.senate, today);
      const out = deriveCommittees(source, bioguideMapFrom(inputs.memberMap, inputs.shareIndex));
      if (!Object.keys(out.people).length) throw new Error("no roster member matched a committee assignment");
      return {
        files: { "db/committee-source.json": pretty(source), "db/person-committees.json": renderCommittees(out) },
        summary: `${Object.keys(out.people).length} roster people, ${Object.keys(out.committees).length} committees`,
      };
    },
  },
};

// The Congress the co-sponsor pull reads: the one the committed source is for
// (the Congress the bill pages and gen-cosponsorships.mjs are on). Moving to a
// new Congress is a deliberate CLI run (--fetch --congress N), not a cron tick.
export function congressOf(inputs) {
  const c = Number(inputs?.cosponsorshipSource?.congress);
  if (!Number.isInteger(c) || c < 100) throw new Error("the committed db/cosponsorship-source.json names no Congress");
  return c;
}

function sortKeys(o) {
  if (Array.isArray(o)) return o.map(sortKeys);
  if (!o || typeof o !== "object") return o;
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = sortKeys(o[k]);
  return out;
}

// ── One invocation ──────────────────────────────────────────────────────────
// deps: { store, inputs, env, fetch, now(): number, budgetMs, hardMs, retries, log }
// Returns { status, line, state }. `store` is a Netlify Blobs store (or any
// object with get(key, {type:"json"}), setJSON, set(key, text, {metadata})).
export async function runSlice(job, deps) {
  const def = JOB_DEFS[job];
  if (!def) throw new Error(`unknown job ${job}`);
  const now = deps.now || Date.now;
  const started = now();
  const today = new Date(started).toISOString().slice(0, 10);
  const log = deps.log || console.log;
  const budgetMs = deps.budgetMs ?? 18_000; // stop starting units after this
  const hardMs = deps.hardMs ?? 25_000; // no request may run past this
  const tag = `congress-sync ${job}`;
  const fail = async (state, msg) => {
    // Drop the staged reads; nothing under files/ was touched.
    const failed = { day: state?.day || today, status: "failed", error: redact(msg), failedAt: new Date(now()).toISOString(), passId: state?.passId || "" };
    try { await deps.store.setJSON(stateKey(job), failed); } catch { /* the pass restarts either way */ }
    const l = `${tag} FAIL — ${redact(msg)} (nothing written)`;
    log(l);
    return { status: 502, line: l, state: failed };
  };

  const key = apiKey(deps.env);
  if (def.needsKey && !key) return fail(null, "CONGRESS_GOV_API_KEY is not set");

  let state = null;
  try { state = await deps.store.get(stateKey(job), { type: "json" }); }
  catch (e) { const l = `${tag} FAIL — state unreadable (${e?.message || e}) (nothing written)`; log(l); return { status: 502, line: l, state: null }; }

  if (state?.status === "done" && state.day === today) {
    const l = `${tag} OK — already current for ${today} (${state.summary || "published"})`;
    log(l);
    return { status: 200, line: l, state };
  }
  // A running pass continues (even past midnight) unless it is stale; a failed
  // or finished-yesterday pass is replaced by a fresh one.
  const stale = state?.status === "running" && started - Date.parse(state.startedAt || 0) > 36 * 3600_000;
  if (!state || state.status !== "running" || stale) {
    let units;
    try { units = def.units(deps.inputs); }
    catch (e) { return fail(null, e?.message || String(e)); }
    if (!units.length) return fail(null, "no units to read");
    state = { day: today, status: "running", passId: `${today}-${started}`, startedAt: new Date(started).toISOString(), units, results: {}, slices: 0 };
  }
  state.slices = (state.slices || 0) + 1;

  const deadline = started + hardMs;
  const retries = deps.retries ?? 2;
  const get = httpClient({ fetch: deps.fetch, now, deadline, retries });
  const ctx = {
    cg: congressGet(get, key),
    getText: httpClient({ fetch: deps.fetch, now, deadline, retries, text: true, perRequestMs: 15000, headers: { "user-agent": "PolitiDex committee sync (public records reader)" } }),
    inputs: deps.inputs,
  };
  const pending = state.units.filter((u) => !Object.prototype.hasOwnProperty.call(state.results, u));
  let error = null;
  let read = 0;
  let next = 0;
  const worker = async () => {
    while (!error && next < pending.length && now() - started < budgetMs) {
      const u = pending[next++];
      try { state.results[u] = await def.read(u, ctx); read++; }
      catch (e) { if (!(e instanceof Deferred)) { error = error || `${u}: ${e?.message || e}`; } }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, def.concurrency || 1) }, worker));
  if (error) return fail(state, error);

  const done = state.units.filter((u) => Object.prototype.hasOwnProperty.call(state.results, u)).length;
  if (done < state.units.length) {
    try { await deps.store.setJSON(stateKey(job), state); }
    catch (e) { return fail(state, `could not save progress (${e?.message || e})`); }
    const l = `${tag} OK — in progress: ${done}/${state.units.length} read (slice ${state.slices}, +${read}); nothing published yet`;
    log(l);
    return { status: 202, line: l, state };
  }

  let built;
  try { built = def.build(state.results, deps.inputs, today); }
  catch (e) { return fail(state, e?.message || String(e)); }

  // Publish: every file of the pass, tagged with the pass id, then the state.
  try {
    for (const [p, text] of Object.entries(built.files)) {
      await deps.store.set(fileKey(p), text, { metadata: { passId: state.passId, fetchedOn: today, job } });
    }
  } catch (e) { return fail(state, `could not publish (${e?.message || e})`); }
  const fin = { day: today, status: "done", passId: state.passId, startedAt: state.startedAt, finishedAt: new Date(now()).toISOString(), slices: state.slices, summary: built.summary, files: Object.keys(built.files) };
  try { await deps.store.setJSON(stateKey(job), fin); } catch { /* files are published; the next tick re-runs a pass */ }
  const l = `${tag} OK — published ${Object.keys(built.files).join(", ")}: ${built.summary} (${state.slices} slice${state.slices === 1 ? "" : "s"})`;
  log(l);
  return { status: 200, line: l, state: fin };
}
