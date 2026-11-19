#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-congress-sync.mjs — the Phase 7 scheduled pulls
// ─────────────────────────────────────────────────────────────────────────────
//   1. Wiring: three scheduled functions, staggered daily windows, the env var
//      they read, no key in the source, nothing outside their lane imported.
//   2. committees: invoked against the official XML (rebuilt from the
//      committed source), it publishes db/committee-source.json and
//      db/person-committees.json byte-identical to the committed files.
//   3. cosponsorships: a multi-slice pass against Congress.gov answers rebuilt
//      from the committed source publishes nothing until the last slice, then
//      db/cosponsorship-source.json and db/cosponsorships.json byte-identical
//      to the committed files.
//   4. bill-record: publishes db/bill-record.json in fetch-bill-record.mjs's
//      exact shape, Utah entries carried over.
//   5. Failure: an HTTP error, a non-JSON answer, an answer missing its list,
//      a short read, a vanished record, a missing key or a missing store —
//      each returns non-2xx, logs FAIL, and leaves files/ untouched (also when
//      the failure lands on a later slice of a pass already in progress).
//   6. Idempotent: a done pass re-run is a no-op; a fresh pass over the same
//      data publishes the same bytes.
//   7. The live reader and the sync script.
//
//   node scripts/test-congress-sync.mjs   (no database, no network)
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { bioguideMap } from "./coverage-core.mjs";
import { CITE } from "./gen-cosponsorships.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)?.slice(0, 300)}, got ${JSON.stringify(a)?.slice(0, 300)}`);
const section = (t) => console.log(`   ── ${t}`);

const dir = mkdtempSync(join(tmpdir(), "csync-"));
const build = async (entry, name) => {
  const out = join(dir, name + ".mjs");
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const C = await import(pathToFileURL(join(ROOT, "netlify/lib/congress-sync-core.mjs")).href);
const L = await import(pathToFileURL(join(ROOT, "netlify/lib/congress-sync-live.mjs")).href);
const S = await import(pathToFileURL(join(ROOT, "scripts/sync-congress-snapshots.mjs")).href);
const FN = {
  "bill-record": await build("netlify/functions/congress-sync-bill-record.mts", "fn-bill-record"),
  cosponsorships: await build("netlify/functions/congress-sync-cosponsorships.mts", "fn-cosponsorships"),
  committees: await build("netlify/functions/congress-sync-committees.mts", "fn-committees"),
};

// An in-memory blob store with the calls the jobs and the sync script use.
function memStore() {
  const m = new Map();
  return {
    m,
    async get(k, o) { if (!m.has(k)) return null; const v = m.get(k).v; return o?.type === "json" ? JSON.parse(v) : v; },
    async getWithMetadata(k) { return m.has(k) ? { data: m.get(k).v, metadata: m.get(k).md } : null; },
    async set(k, v, o = {}) { m.set(k, { v: String(v), md: o.metadata || {} }); },
    async setJSON(k, v) { m.set(k, { v: JSON.stringify(v), md: {} }); },
    files() { return Object.fromEntries([...m].filter(([k]) => k.startsWith("files/")).map(([k, x]) => [k, x.v])); },
  };
}
const clock = (iso, step = 1) => { let t = Date.parse(iso); return () => (t += step); };
const quiet = () => {};
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── 1 · wiring ──────────────────────────────────────────────────────────────
section("1 · wiring");
for (const job of C.JOBS) {
  const src = R(`netlify/functions/congress-sync-${job}.mts`);
  eq(FN[job].config.schedule, C.SCHEDULES[job], `${job}: the function's schedule is the documented one`);
  ok(typeof FN[job].default === "function" && typeof FN[job].run === "function", `${job}: the function exports a handler and run()`);
  ok(!/path:/.test(src.replace(/\/\/.*$/gm, "")), `${job}: scheduled only, no public route`);
  ok(!/[A-Za-z0-9]{40}/.test(src.replace(/\/\/.*$/gm, "")), `${job}: no key-like literal in the source`);
}
const hours = C.JOBS.map((j) => C.SCHEDULES[j].split(" ")[1]);
eq(new Set(hours).size, 3, "each job has its own hour (staggered)");
ok(hours.every((h) => /^\d+$/.test(h) && Number(h) < 7), "every window closes before the 07:00 voting-record ingest");
const perDay = (cron) => { const [m] = cron.split(" "); return /^\*\/(\d+)$/.test(m) ? 60 / Number(m.slice(2)) : 1; };
ok(C.JOBS.reduce((n, j) => n + perDay(C.SCHEDULES[j]), 0) <= 15, "≤15 invocations a day for the three jobs");
eq(C.apiKey({ CONGRESS_GOV_API_KEY: "a" }), "a", "reads CONGRESS_GOV_API_KEY");
eq(C.apiKey({ CONGRESS_API_KEY: "b" }), "b", "accepts CONGRESS_API_KEY as an alias");
eq(C.apiKey({ CONGRESS_GOV_API_KEY: "a", CONGRESS_API_KEY: "b" }), "a", "CONGRESS_GOV_API_KEY wins");
const lane = ["netlify/lib/congress-sync-core.mjs", "netlify/lib/congress-sync-live.mjs", "netlify/lib/bill-record-federal.mjs", ...C.JOBS.map((j) => `netlify/functions/congress-sync-${j}.mts`)];
for (const f of lane) {
  const imports = [...R(f).matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  ok(!imports.some((i) => /stance|score|locker|raw-ingest|publish|vote-actions|database/.test(i)), `${f}: imports nothing from the stance engine, scoring, Locker, publish gate, raw ingest or database`);
}
const memberMap = J("db/vr-member-map.json"), shareIndex = J("db/share-index.json");
const bgm = C.bioguideMapFrom(memberMap, shareIndex);
eq([...bgm].sort(), [...bioguideMap()].sort(), "the function-side bioguide→roster bridge equals coverage-core's (cmp-data.js) one");

// ── 2 · committees ──────────────────────────────────────────────────────────
section("2 · committees");
const cmSource = J("db/committee-source.json");
function houseXml(h) {
  const members = Object.entries(h.members).map(([bg, rows]) => `<member><member-info><bioguideID>${bg}</bioguideID></member-info><committee-assignments>${rows.map(([code, rank, lead]) => {
    const tag = h.committees[code]?.p ? "subcommittee" : "committee";
    return `<${tag} ${tag === "committee" ? "comcode" : "subcomcode"}="${code}"${rank != null ? ` rank="${rank}"` : ""}${lead ? ` leadership="${esc(lead)}"` : ""}/>`;
  }).join("")}</committee-assignments></member>`).join("\n");
  const tops = Object.entries(h.committees).filter(([, c]) => !c.p);
  const committees = tops.map(([code, c]) => `<committee comcode="${code}" type="${esc(c.t)}"><committee-fullname>${esc(c.n)}</committee-fullname>${Object.entries(h.committees).filter(([, s]) => s.p === code).map(([sc, s]) => `<subcommittee subcomcode="${sc}"><subcommittee-fullname>${esc(s.n)}</subcommittee-fullname></subcommittee>`).join("")}</committee>`).join("\n");
  return `<?xml version="1.0"?><MemberData publish-date="${esc(h.published)}"><title-info><congress-num>${h.congress}</congress-num></title-info><members>\n${members}\n</members><committees>\n${committees}\n</committees></MemberData>`;
}
function senateXml(s) {
  return `<?xml version="1.0"?><contact_information><lastUpdate>${esc(s.updated)}</lastUpdate>${Object.entries(s.members).map(([bg, rows]) => `<senator><bioguideId>${bg}</bioguideId><committees>${rows.map(([code]) => `<committee code="${code}">${esc(s.committees[code].n)}</committee>`).join("")}</committees></senator>`).join("\n")}</contact_information>`;
}
const HXML = houseXml(cmSource.house), SXML = senateXml(cmSource.senate);
const xmlFetch = (over = {}) => async (url) => {
  if (over[url]) return over[url]();
  if (/clerk\.house\.gov/.test(url)) return res(200, HXML);
  if (/senate\.gov/.test(url)) return res(200, SXML);
  throw new Error(`unexpected fetch ${url}`);
};
{
  const store = memStore();
  const r = await FN.committees.run({ store, fetch: xmlFetch(), now: clock(`${cmSource.fetchedOn}T04:40:00Z`), env: {}, log: quiet });
  eq(r.status, 200, "committees: one invocation finishes the pass (200)");
  ok(/^congress-sync committees OK — published/.test(r.line), "committees: logs an OK line");
  const files = store.files();
  eq(Object.keys(files).sort(), ["files/db/committee-source.json", "files/db/person-committees.json"], "committees: publishes exactly the two files the generator writes");
  ok(files["files/db/committee-source.json"] === R("db/committee-source.json"), "committees: db/committee-source.json is byte-identical to the committed file");
  ok(files["files/db/person-committees.json"] === R("db/person-committees.json"), "committees: db/person-committees.json is byte-identical to the committed file");
  const again = await FN.committees.run({ store, fetch: async () => { throw new Error("no fetch on a done pass"); }, now: clock(`${cmSource.fetchedOn}T05:00:00Z`), env: {}, log: quiet });
  ok(again.status === 200 && /already current/.test(again.line), "committees: a re-run on the same day is a no-op");
  // A fresh pass over the same data publishes the same bytes.
  await store.setJSON(C.stateKey("committees"), { status: "failed" });
  const before = JSON.stringify(store.files());
  const r2 = await FN.committees.run({ store, fetch: xmlFetch(), now: clock(`${cmSource.fetchedOn}T06:00:00Z`), env: {}, log: quiet });
  ok(r2.status === 200 && JSON.stringify(store.files()) === before, "committees: re-running a pass is idempotent (same bytes)");
}
for (const [label, over] of [
  ["House file HTTP 503", { [`https://clerk.house.gov/xml/lists/MemberData.xml`]: async () => res(503, "") }],
  ["Senate file 404", { [`https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml`]: async () => res(404, "") }],
  ["House short read", { [`https://clerk.house.gov/xml/lists/MemberData.xml`]: async () => res(200, "<MemberData><members></members></MemberData>") }],
  ["network error", { [`https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml`]: async () => { throw new TypeError("fetch failed"); } }],
]) {
  const store = memStore();
  await store.set("files/db/person-committees.json", "PRIOR", { metadata: { passId: "old" } });
  const lines = [];
  const r = await FN.committees.run({ store, fetch: xmlFetch(over), now: clock("2026-11-20T04:40:00Z"), env: {}, retries: 0, log: (l) => lines.push(l) });
  ok(r.status >= 500, `committees ${label}: non-2xx (${r.status})`);
  ok(lines.length === 1 && /^congress-sync committees FAIL — .*\(nothing written\)$/.test(lines[0]), `committees ${label}: one FAIL line`);
  eq(store.files(), { "files/db/person-committees.json": "PRIOR" }, `committees ${label}: files/ untouched`);
}

// ── 3 · cosponsorships ──────────────────────────────────────────────────────
section("3 · cosponsorships");
const csSource = J("db/cosponsorship-source.json");
const TYPE = Object.fromEntries(Object.entries(CITE).map(([t, c]) => [c, t]));
const apiRows = (bg) => (csSource.members[bg] || []).map((k) => {
  const [cong, cite] = k.split("|");
  const [pre, num] = cite.split(" ");
  const [title, intro, area] = csSource.bills[k];
  return { congress: Number(cong), type: TYPE[pre], number: num, title, introducedDate: intro, policyArea: area ? { name: area } : null, url: "https://api.congress.gov/x" };
});
let calls = 0;
const keysSeen = new Set();
const congressFetch = (over) => async (url) => {
  calls++;
  const u = new URL(url);
  keysSeen.add(u.searchParams.get("api_key"));
  if (over) { const o = await over(u); if (o) return o; }
  const m = /\/v3\/member\/([A-Z]\d{6})\/cosponsored-legislation$/.exec(u.pathname);
  if (!m) throw new Error(`unexpected fetch ${u.pathname}`);
  const off = Number(u.searchParams.get("offset") || 0);
  return res(200, { cosponsoredLegislation: apiRows(m[1]).slice(off, off + 250) });
};
const csDeps = (store, extra = {}) => ({ store, env: { CONGRESS_GOV_API_KEY: "test-key" }, budgetMs: 300, log: quiet, ...extra });
{
  const store = memStore();
  const now = clock(`${csSource.fetchedOn}T06:00:00Z`, 2);
  let r, slices = 0, publishedEarly = false;
  do {
    r = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(), now }));
    slices++;
    if (r.status === 202 && Object.keys(store.files()).length) publishedEarly = true;
  } while (r.status === 202 && slices < 200);
  ok(slices > 2, `cosponsorships: the pass ran over several slices (${slices})`);
  ok(!publishedEarly, "cosponsorships: nothing is published before the last slice");
  eq(r.status, 200, "cosponsorships: the last slice publishes (200)");
  ok(/^congress-sync cosponsorships OK — published db\/cosponsorship-source\.json, db\/cosponsorships\.json/.test(r.line), "cosponsorships: logs an OK line naming the files");
  eq([...keysSeen], ["test-key"], "cosponsorships: every request carries the env key, and only it");
  const files = store.files();
  ok(files["files/db/cosponsorship-source.json"] === R("db/cosponsorship-source.json"), "cosponsorships: db/cosponsorship-source.json is byte-identical to the committed file");
  ok(files["files/db/cosponsorships.json"] === R("db/cosponsorships.json"), "cosponsorships: db/cosponsorships.json is byte-identical to the committed file");
  ok(!/test-key/.test(JSON.stringify([...store.m.values()])), "cosponsorships: the key is never stored");
}
{
  // A failure on a later slice of a pass in progress drops the pass and
  // leaves the published files as they were.
  const store = memStore();
  await store.set("files/db/cosponsorships.json", "PRIOR", { metadata: { passId: "old" } });
  const now = clock("2026-11-21T06:00:00Z", 2);
  const first = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(), now }));
  eq(first.status, 202, "cosponsorships: a first slice is in progress (202)");
  const lines = [];
  const r = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(async () => res(500, "boom")), now, retries: 0, log: (l) => lines.push(l) }));
  eq(r.status, 502, "cosponsorships: an HTTP 500 on a later slice → 502");
  ok(/^congress-sync cosponsorships FAIL — [A-Z]\d{6}: .*HTTP 500.*\(nothing written\)$/.test(lines[0] || ""), "cosponsorships: one FAIL line naming the member");
  ok(!/test-key/.test(lines.join("")), "cosponsorships: the FAIL line does not print the key");
  eq(store.files(), { "files/db/cosponsorships.json": "PRIOR" }, "cosponsorships: files/ untouched after a failed slice");
  const st = await store.get(C.stateKey("cosponsorships"), { type: "json" });
  ok(st.status === "failed" && !st.results, "cosponsorships: the staged reads are dropped");
  const fresh = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(), now }));
  ok(fresh.status === 202 && /in progress: \d+\//.test(fresh.line), "cosponsorships: the next invocation starts a fresh pass");
}
for (const [label, over, want] of [
  ["non-JSON answer", async () => res(200, "<html>maintenance</html>"), /not JSON/],
  ["answer without its list", async () => res(200, { error: "rate limited" }), /no cosponsoredLegislation list/],
  ["HTTP 403", async () => res(403, { error: "API_KEY_INVALID" }), /HTTP 403/],
]) {
  const store = memStore();
  const lines = [];
  const r = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(over), now: clock("2026-11-22T06:00:00Z"), retries: 0, log: (l) => lines.push(l) }));
  ok(r.status === 502 && want.test(lines[0] || ""), `cosponsorships ${label}: 502 with a FAIL line (${lines[0]})`);
  eq(store.files(), {}, `cosponsorships ${label}: nothing written`);
}
{
  // A short read (most members suddenly empty) is refused at build time.
  const store = memStore();
  const r = await FN.cosponsorships.run(csDeps(store, { fetch: congressFetch(async () => res(200, { cosponsoredLegislation: [] })), now: clock("2026-11-23T06:00:00Z"), budgetMs: 60_000 }));
  ok(r.status === 502 && /short read/.test(r.line), "cosponsorships: a short read is refused");
  eq(store.files(), {}, "cosponsorships: short read → nothing written");
}
{
  const store = memStore();
  calls = 0;
  const r = await FN.cosponsorships.run({ store, env: {}, fetch: congressFetch(), log: quiet });
  ok(r.status === 502 && /CONGRESS_GOV_API_KEY is not set/.test(r.line) && calls === 0, "cosponsorships: no key → 502, no request made");
  eq(store.files(), {}, "cosponsorships: no key → nothing written");
}

// ── 4 · bill-record ─────────────────────────────────────────────────────────
section("4 · bill-record");
const BR = J("db/bill-record.json");
const utahKey = Object.keys(BR.records).find((k) => /GS\|/.test(k));
const brInputs = {
  billDocs: { docs: { "119|H.R. 9999": {}, "119|S.J.Res. 9998": {}, [utahKey]: {} } },
  billRecord: { records: { "119|H.R. 9999": { src: "x", ch: "house", in: "2025-01-01", sp: [], a: [] }, [utahKey]: BR.records[utahKey] } },
};
const sponsor = { bioguideId: "A000001", fullName: "Rep. Doe, Jane [R-UT-1]" };
const acts = (intro) => ({ actions: [
  { actionDate: "2025-02-01", text: "Became Public Law No: 119-99.", actionCode: "36000", sourceSystem: { code: 9, name: "Library of Congress" } },
  { actionDate: "2025-01-03", text: intro, actionCode: intro.includes("House") ? "1000" : "10000", sourceSystem: { code: 9, name: "Library of Congress" } },
  { actionDate: "2025-01-03", text: "Referred to the House Committee.", actionCode: "H11100", sourceSystem: { code: 2, name: "House floor actions" } },
] });
const billApi = (over) => async (url) => {
  const u = new URL(url);
  if (over) { const o = await over(u); if (o) return o; }
  const p = u.pathname.replace(/^\/v3\//, "");
  if (p === "bill/119/hr/9999") return res(200, { bill: { originChamber: "House", introducedDate: "2025-01-03", sponsors: [sponsor] } });
  if (p === "bill/119/hr/9999/cosponsors") return res(200, { cosponsors: [{ bioguideId: "B000002", fullName: "Sen. Roe, Rick [D-CA]" }, { bioguideId: "C000003", fullName: "Rep. Gone, Gail [R-TX-2]", sponsorshipWithdrawnDate: "2025-01-05" }] });
  if (p === "bill/119/hr/9999/actions") return res(200, acts("Introduced in House"));
  if (p === "bill/119/sjres/9998") return res(200, { bill: { originChamber: "Senate", introducedDate: "2025-01-03", sponsors: [] } });
  if (p === "bill/119/sjres/9998/cosponsors") return res(200, { cosponsors: [] });
  if (p === "bill/119/sjres/9998/actions") return res(200, acts("Introduced in Senate"));
  return res(404, {});
};
{
  const store = memStore();
  const r = await FN["bill-record"].run({ store, inputs: brInputs, env: { CONGRESS_GOV_API_KEY: "k" }, fetch: billApi(), now: clock("2026-11-19T05:00:00Z"), log: quiet });
  eq(r.status, 200, "bill-record: the pass publishes (200)");
  ok(/^congress-sync bill-record OK — published db\/bill-record\.json: 2 federal records \(\+1 Utah carried over\)/.test(r.line), "bill-record: logs an OK line with the counts");
  const files = store.files();
  eq(Object.keys(files), ["files/db/bill-record.json"], "bill-record: publishes only db/bill-record.json");
  const text = files["files/db/bill-record.json"];
  const out = JSON.parse(text);
  eq(Object.keys(out), ["_comment", "fetchedOn", "records"], "bill-record: the file's top-level shape is fetch-bill-record.mjs's");
  eq(out._comment, BR._comment, "bill-record: the same provenance comment");
  eq(out.fetchedOn, "2026-11-19", "bill-record: fetchedOn is the pass's day");
  eq(Object.keys(out.records), ["119|H.R. 9999", "119|S.J.Res. 9998", utahKey].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), "bill-record: federal records plus the Utah entry, sorted as the CLI sorts");
  eq(out.records[utahKey], BR.records[utahKey], "bill-record: the Utah entry is carried over unchanged");
  const hr = out.records["119|H.R. 9999"];
  eq(Object.keys(hr), ["src", "ch", "in", "sp", "a"], "bill-record: an entry carries exactly src, ch, in, sp, a");
  eq(hr.src, "https://www.congress.gov/bill/119th-congress/house-bill/9999", "bill-record: src is the Congress.gov page");
  eq(hr.sp, [{ r: "sponsor", id: "A000001", n: "Rep. Doe, Jane [R-UT-1]", h: "H" }, { r: "cosponsor", id: "B000002", n: "Sen. Roe, Rick [D-CA]", h: "S" }], "bill-record: sponsors in the record's order, withdrawn co-sponsors left out");
  eq(hr.a.map((x) => x.s), ["introduced", "law"], "bill-record: key actions only, oldest first (the clerk's duplicate is not read)");
  ok(hr.a.every((x) => Object.keys(x).join() === "d,s,c,x"), "bill-record: each action is { d, s, c, x }");
  ok(text.startsWith('{\n "_comment"') && text.endsWith("}\n"), "bill-record: rendered as the CLI renders it");
}
for (const [label, over, want] of [
  ["HTTP 500 on an actions page", async (u) => (/actions$/.test(u.pathname) ? res(500, "") : null), /HTTP 500/],
  ["actions answer missing its list", async (u) => (/9999\/actions$/.test(u.pathname) ? res(200, { pagination: {} }) : null), /no actions list/],
  ["a measure on file vanishes (404)", async (u) => (/hr\/9999$/.test(u.pathname) ? res(404, {}) : null), /no record for 1 measure/],
]) {
  const store = memStore();
  await store.set("files/db/bill-record.json", "PRIOR", { metadata: { passId: "old" } });
  const lines = [];
  const r = await FN["bill-record"].run({ store, inputs: brInputs, env: { CONGRESS_GOV_API_KEY: "k" }, fetch: billApi(over), now: clock("2026-11-19T05:00:00Z"), retries: 0, log: (l) => lines.push(l) });
  ok(r.status === 502 && lines.length === 1 && /^congress-sync bill-record FAIL — /.test(lines[0]) && want.test(lines[0]), `bill-record ${label}: 502 with one FAIL line (${lines[0]})`);
  eq(store.files(), { "files/db/bill-record.json": "PRIOR" }, `bill-record ${label}: files/ untouched`);
}
{
  // The real target list: every federal bill page, nothing from Utah.
  const units = C.JOB_DEFS["bill-record"].units({ billDocs: J("db/bill-docs.json") });
  eq(units.length, Object.keys(BR.records).filter((k) => !/GS\|/.test(k)).length, "bill-record: the pass reads every federal measure with a page");
  ok(units.every((k) => !/GS\|/.test(k)), "bill-record: no Utah unit");
}
{
  // The default handler with no blob environment: non-2xx, nothing fetched.
  const realFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = async () => { fetched++; throw new Error("offline"); };
  const saved = process.env.NETLIFY_BLOBS_CONTEXT;
  delete process.env.NETLIFY_BLOBS_CONTEXT;
  const log = console.log; console.log = () => {};
  try {
    for (const job of C.JOBS) {
      const resp = await FN[job].default();
      ok(resp instanceof Response && resp.status >= 400, `${job}: the scheduled handler answers non-2xx when it cannot run (${resp.status})`);
    }
  } finally { console.log = log; globalThis.fetch = realFetch; if (saved !== undefined) process.env.NETLIFY_BLOBS_CONTEXT = saved; }
  ok(fetched === 0, "no handler reaches the network without a store and a pass to run");
}

// ── 5 · the live reader ─────────────────────────────────────────────────────
section("5 · live reader");
{
  const committed = J("db/person-committees.json");
  const newer = { ...committed, sources: { ...committed.sources, fetchedOn: "2099-01-01" } };
  const older = { ...committed, sources: { ...committed.sources, fetchedOn: "2000-01-01" } };
  const storeWith = (v) => async () => ({ get: async () => v });
  eq((await L.liveFile("db/person-committees.json", committed, { storeFor: storeWith(newer) })()).sources.fetchedOn, "2099-01-01", "a newer published copy is served");
  ok((await L.liveFile("db/person-committees.json", committed, { storeFor: storeWith(older) })()) === committed, "an older published copy is ignored");
  ok((await L.liveFile("db/person-committees.json", committed, { storeFor: storeWith(null) })()) === committed, "no published copy → the committed file");
  ok((await L.liveFile("db/person-committees.json", committed, { storeFor: storeWith({ fetchedOn: "2099" }) })()) === committed, "a published copy of the wrong shape is ignored");
  const log = console.log; console.log = () => {};
  ok((await L.liveFile("db/cosponsorships.json", { fetchedOn: "x" }, { storeFor: async () => { throw new Error("down"); } })()).fetchedOn === "x", "a store outage → the committed file");
  console.log = log;
  let reads = 0;
  const memo = L.liveFile("db/cosponsorships.json", J("db/cosponsorships.json"), { storeFor: async () => ({ get: async () => { reads++; return null; } }) });
  await memo(); await memo();
  eq(reads, 1, "one store read per instance per TTL");
  const pc = R("netlify/functions/person-coverage.mts");
  ok(/committeesFor\(pid, await committeesNow\(\)\)/.test(pc) && /cosponsorshipsFor\(pid, await cosponsorsNow\(\)\)/.test(pc) && /billCosponsorsFor\(key, await cosponsorsNow\(\)\)/.test(pc), "person-coverage serves the live committee and co-sponsor files");
  ok(!/congress-sync/.test(R("netlify/functions/committee-page.mts")), "the committee page stays on the committed file (it matches the sitemap)");
}

// ── 6 · the sync script ─────────────────────────────────────────────────────
section("6 · sync script");
{
  const root = join(dir, "root");
  mkdirSync(join(root, "db"), { recursive: true });
  writeFileSync(join(root, "db/committee-source.json"), JSON.stringify({ fetchedOn: "2026-11-10" }));
  writeFileSync(join(root, "db/cosponsorship-source.json"), JSON.stringify({ fetchedOn: "2026-11-30" }));
  const store = memStore();
  eq((await S.planJob(store, "committees", root)).action, "skip", "sync: a job that never ran is skipped");
  await store.setJSON(C.stateKey("committees"), { status: "done", passId: "p1" });
  await store.set("files/db/committee-source.json", JSON.stringify({ fetchedOn: "2026-11-19" }), { metadata: { passId: "p0" } });
  ok(/different pass/.test((await S.planJob(store, "committees", root)).reason), "sync: a file from another pass is skipped");
  await store.set("files/db/committee-source.json", JSON.stringify({ fetchedOn: "2026-11-19" }), { metadata: { passId: "p1" } });
  const w = await S.planJob(store, "committees", root);
  ok(w.action === "write" && w.reason === "2026-11-10 → 2026-11-19", "sync: a finished, newer pass is written");
  await store.setJSON(C.stateKey("cosponsorships"), { status: "done", passId: "p2" });
  await store.set("files/db/cosponsorship-source.json", JSON.stringify({ fetchedOn: "2026-11-19" }), { metadata: { passId: "p2" } });
  ok(/older than db/.test((await S.planJob(store, "cosponsorships", root)).reason), "sync: a published copy older than db/ is never written back");
  await store.setJSON(C.stateKey("bill-record"), { status: "failed", error: "HTTP 500" });
  ok(/failed: HTTP 500/.test((await S.planJob(store, "bill-record", root)).reason), "sync: a failed pass is reported, not copied");
  eq(S.SOURCE_FILES, { "bill-record": "db/bill-record.json", cosponsorships: "db/cosponsorship-source.json", committees: "db/committee-source.json" }, "sync: copies the three source files the generators read");
}

// ── 7 · the worker precache ─────────────────────────────────────────────────
section("7 · service worker");
{
  const sw = R("sw.js");
  for (const f of ["db/bill-record.json", "db/cosponsorships.json", "db/person-committees.json", "db/cosponsorship-source.json", "db/committee-source.json"]) ok(!sw.includes(`'/${f}'`), `${f} is not precached (no CACHE_VERSION bump)`);
}

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.error(`\n✗ ${failures.length} failing:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log(`\n✓ congress-sync: ${passed} checks pass`);
