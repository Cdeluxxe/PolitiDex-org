#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-bill-standard.mjs — scaffold and check bill ground-truth ledgers (bill-gt-v1)
// ─────────────────────────────────────────────────────────────────────────────
// The standard and its rules live in scripts/bill-standard-core.mjs; the
// reference ledger is db/bill-standard/119-s-5653.json.
//
//   node scripts/gen-bill-standard.mjs --bill "119|S. 1234" [--vehicle "119|H.R. 2347"] [--out <file>] [--force]
//       Write a new ledger in the reference shape from the official record
//       (Congress.gov API, CONGRESS_GOV_API_KEY; roll calls from senate.gov and
//       clerk.house.gov). It fills identity, sponsors and cosponsors, the dated
//       action timeline, status, text versions and recorded roll calls with
//       roster links. Overview, provisions, issue mappings, claims and statements
//       start empty with completeness marked "missing": the generator never
//       writes a provision, mapping or quote. An existing ledger is never
//       overwritten without --force (the reading pass is hand work).
//       --vehicle adds the measure the bill is moving on: its identity row, its
//       own status, its actions in the timeline and its roll calls.
//
//   node scripts/gen-bill-standard.mjs --check [--strict] [--verify-quotes] [files…]
//       Validate every ledger in db/bill-standard/ (or the files named).
//       --strict         a "missing" completeness mark is an error (publish-ready)
//       --verify-quotes  fetch each cited text and confirm every quote appears
//                        in it word for word (network)
//       Exit 0 = every ledger passes · 1 = a ledger fails.
//
// Reading pass checklist (what a person or agent fills after the scaffold):
//   provisions  every title and section, plain description, verbatim textQuote
//   issues      register keys only; splitMappingRule — one row per direction
//   considered  every key weighed and declined, with whyNot
//   claims      both sides' own words, whatTheTextSays, plainRead
//   statedOnBill sponsors' and cosponsors' own pages or the Congressional Record
//   completeness every mark updated; the E note's counts must match the lists
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./bill-standard-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "db/bill-standard");
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const today = () => new Date().toISOString().slice(0, 10);

export function context() {
  return {
    issueKeys: new Set(readJson("db/issue-keys.json").keys),
    people: new Set(Object.keys(readJson("db/share-index.json").people)),
  };
}

/** LIS member id → roster id, from the committed Senate vote seeds and ledgers that already carry both. */
export function lisMap() {
  const out = {};
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== "object") return;
    const lis = v.lisMemberId ?? v.lis;
    if (typeof lis === "string" && /^S\d+$/.test(lis) && typeof v.politicianId === "string") out[lis] = out[lis] || v.politicianId;
    Object.values(v).forEach(walk);
  };
  const files = [
    ...fs.readdirSync(path.join(root, "db")).filter((f) => f.endsWith(".json")).map((f) => path.join(root, "db", f)),
    ...(fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(DIR, f)) : []),
  ];
  for (const f of files) {
    const t = fs.readFileSync(f, "utf8");
    if (!/"(lisMemberId|lis)"\s*:\s*"S\d+"/.test(t)) continue;
    try { walk(JSON.parse(t)); } catch { /* not JSON we can read */ }
  }
  return out;
}

// ── Official record readers ─────────────────────────────────────────────────
const API = "https://api.congress.gov/v3";
const AMD_CAP = 400; // amendments read for roll calls; any beyond are recorded as not read
async function get(url, asText = false) {
  const r = await fetch(url, { headers: { "User-Agent": "bill-standard-generator" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url.replace(/api_key=[^&]+/, "api_key=…")}`);
  return asText ? r.text() : r.json();
}
async function api(p, key) {
  const items = [];
  let url = `${API}/${p}?format=json&limit=250&api_key=${key}`;
  let first = null;
  for (let i = 0; url && i < 20; i++) {
    const j = await get(url);
    first = first || j;
    const listKey = Object.keys(j).find((k) => Array.isArray(j[k]));
    if (!listKey) return j;
    items.push(...j[listKey]);
    url = j.pagination?.next ? `${j.pagination.next}&api_key=${key}&format=json` : null;
  }
  return items;
}

const tag = (x, t) => S.normText((new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(x) || [])[1] || "");
const MONTH = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

export function parseSenateVote(xml, url) {
  const members = [...xml.matchAll(/<member>([\s\S]*?)<\/member>/g)].map(([, m]) => ({
    lis: tag(m, "lis_member_id"), name: tag(m, "member_full"), party: tag(m, "party"), vote: tag(m, "vote_cast"),
  }));
  const d = /(\w+) (\d{1,2}), (\d{4})/.exec(tag(xml, "vote_date")) || [];
  const question = tag(xml, "vote_question_text");
  const amendmentNo = tag((/<amendment>([\s\S]*?)<\/amendment>/.exec(xml) || [])[1] || "", "amendment_number");
  return {
    chamber: "senate", congress: +tag(xml, "congress"), session: +tag(xml, "session"), roll: +tag(xml, "vote_number"),
    date: d[3] ? `${d[3]}-${MONTH[d[1].slice(0, 3)]}-${d[2].padStart(2, "0")}` : null,
    // A vote on an amendment is the amendment's; the document is the measure it amends.
    measure: (amendmentNo && question.includes(amendmentNo) ? amendmentNo : tag(xml, "document_name")) || null,
    question: tag(xml, "vote_question_text"), result: tag(xml, "vote_result_text"),
    requiredMajority: tag(xml, "majority_requirement") || null, sourceUrl: url.replace(/\.xml$/, ".htm"), members,
  };
}
export function parseHouseVote(xml, url) {
  const members = [...xml.matchAll(/<recorded-vote>([\s\S]*?)<\/recorded-vote>/g)].map(([, m]) => {
    const a = (k) => (new RegExp(`${k}="([^"]*)"`).exec(m) || [])[1] || "";
    const name = S.normText((/<legislator[^>]*>([\s\S]*?)<\/legislator>/.exec(m) || [])[1]);
    return { bioguideId: a("name-id"), name: `${name} (${a("party")}-${a("state")})`, party: a("party"), vote: tag(m, "vote") };
  });
  const d = /(\d{1,2})-(\w{3})-(\d{4})/.exec(tag(xml, "action-date")) || [];
  return {
    chamber: "house", congress: +tag(xml, "congress"), session: parseInt(tag(xml, "session"), 10), roll: +tag(xml, "rollcall-num"),
    date: d[3] ? `${d[3]}-${MONTH[d[2]]}-${d[1].padStart(2, "0")}` : null,
    measure: tag(xml, "legis-num") || null, question: tag(xml, "vote-question"), result: tag(xml, "vote-result"),
    requiredMajority: /2\/3/.test(tag(xml, "vote-type")) ? "2/3" : "1/2", sourceUrl: url, members,
  };
}

export async function fetchRecord(congress, number, key) {
  const m = /^([A-Za-z.]+?)\s*(\d+)$/.exec(number.trim());
  if (!m) throw new Error(`cannot read the bill number ${number}`);
  const type = m[1].toLowerCase().replace(/\./g, "");
  const p = `bill/${congress}/${type}/${m[2]}`;
  const bill = (await get(`${API}/${p}?format=json&api_key=${key}`)).bill;
  const [actions, cosponsors, titles, textVersions, relatedBills] = await Promise.all(
    ["actions", "cosponsors", "titles", "text", "relatedbills"].map((x) => api(`${p}/${x}`, key).catch((e) => ({ error: e.message }))),
  );
  const gaps = [];
  const ok = (name, v) => (Array.isArray(v) ? v : (gaps.push(`${name}: ${v.error || "not a list"}`), []));
  const rec = { bill, actions: ok("actions", actions), cosponsors: ok("cosponsors", cosponsors), titles: ok("titles", titles), textVersions: ok("text", textVersions), relatedBills: ok("relatedbills", relatedBills), rollcalls: [], gaps };
  // Votes on amendments to the measure (a floor substitute, motions to table)
  // are recorded on the amendment's own actions, not the bill's.
  const amendments = await api(`${p}/amendments`, key).catch((e) => (gaps.push(`amendments: ${e.message}`), []));
  const amdActions = [];
  for (const am of Array.isArray(amendments) ? amendments.slice(0, AMD_CAP) : []) {
    const t = String(am.type || "").toLowerCase();
    const rows = await api(`amendment/${am.congress}/${t}/${am.number}/actions`, key).catch((e) => (gaps.push(`amendment ${am.type} ${am.number} actions: ${e.message}`), []));
    if (Array.isArray(rows)) amdActions.push(...rows);
  }
  if (Array.isArray(amendments) && amendments.length > AMD_CAP) gaps.push(`${amendments.length - AMD_CAP} amendments past the first ${AMD_CAP} not read for roll calls`);
  const seen = new Set();
  for (const a of [...rec.actions, ...amdActions]) for (const rv of a.recordedVotes || []) {
    if (!rv.url || seen.has(rv.url)) continue;
    seen.add(rv.url);
    try {
      const xml = await get(rv.url, true);
      rec.rollcalls.push(/senate\.gov/.test(rv.url) ? parseSenateVote(xml, rv.url) : parseHouseVote(xml, rv.url));
    } catch (e) { gaps.push(`roll call ${rv.url}: ${e.message}`); }
  }
  rec.rollcalls.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.roll - y.roll));
  return rec;
}

// ── Modes ───────────────────────────────────────────────────────────────────
async function verifyQuotes(L) {
  const texts = new Map(), bad = [];
  for (const q of S.quotesOf(L)) {
    if (!texts.has(q.url)) texts.set(q.url, await get(q.url, true).then(S.normText).catch((e) => ({ error: e.message })));
    const t = texts.get(q.url);
    if (typeof t !== "string") bad.push(`${q.where}: could not read ${q.url} (${t.error}) — record that the source could not be read`);
    else if (!t.includes(S.normText(q.quote))) bad.push(`${q.where}: quote not found word for word in ${q.url}`);
  }
  return bad;
}

async function check(args) {
  const files = args.filter((a) => !a.startsWith("--"));
  const list = files.length ? files.map((f) => path.resolve(f)) : fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => path.join(DIR, f));
  const ctx = { ...context(), strict: args.includes("--strict") };
  let failed = 0;
  for (const f of list) {
    const L = JSON.parse(fs.readFileSync(f, "utf8"));
    const { errors, warnings } = S.validateLedger(L, ctx);
    if (args.includes("--verify-quotes")) errors.push(...(await verifyQuotes(L)));
    const rel = path.relative(root, f);
    console.log(`${errors.length ? "FAIL" : "ok  "} ${rel} — ${errors.length} error(s), ${warnings.length} warning(s)`);
    errors.forEach((e) => console.log(`   ✗ ${e}`));
    warnings.forEach((w) => console.log(`   ! ${w}`));
    if (errors.length) failed++;
  }
  return failed ? 1 : 0;
}

async function scaffold(args) {
  const bill = args[args.indexOf("--bill") + 1] || "";
  const [congress, number] = bill.split("|");
  if (!congress || !number) throw new Error('--bill takes "<congress>|<number>", e.g. "119|S. 5653"');
  const key = process.env.CONGRESS_GOV_API_KEY;
  if (!key) throw new Error("CONGRESS_GOV_API_KEY is not set; the scaffold reads the official record only and will not guess");
  const out = args.includes("--out") ? path.resolve(args[args.indexOf("--out") + 1]) : path.join(DIR, S.ledgerFileName(congress, number));
  if (fs.existsSync(out) && !args.includes("--force")) throw new Error(`${path.relative(root, out)} exists; it may hold a reading pass. Pass --force to replace it.`);
  let vehicle = null;
  if (args.includes("--vehicle")) {
    const [vc, vn] = String(args[args.indexOf("--vehicle") + 1] || "").split("|");
    if (!vc || !vn) throw new Error('--vehicle takes "<congress>|<number>", e.g. "119|H.R. 2347"');
    vehicle = await fetchRecord(+vc, vn, key);
  }
  const rec = await fetchRecord(+congress, number, key);
  if (vehicle) rec.gaps.push(...vehicle.gaps.map((g) => `vehicle ${g}`));
  const L = S.scaffoldLedger(rec, { vehicle, today: today(), memberMap: readJson("db/vr-member-map.json").map, lisMap: lisMap(), people: context().people });
  if (rec.gaps.length) L.completeness.I_citations.note += ` Could not read: ${rec.gaps.join("; ")}.`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(L, null, 1));
  const { errors, warnings } = S.validateLedger(L, context());
  console.log(`wrote ${path.relative(root, out)} — ${errors.length} error(s), ${warnings.length} warning(s) (missing sections are expected until the reading pass)`);
  errors.forEach((e) => console.log(`   ✗ ${e}`));
  return errors.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const run = args.includes("--bill") ? scaffold : args.includes("--check") ? check : null;
  if (!run) { console.error("usage: --bill \"<congress>|<number>\" [--vehicle \"<congress>|<number>\"] [--out f] [--force]  |  --check [--strict] [--verify-quotes] [files…]"); process.exit(2); }
  run(args).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(2); });
}
