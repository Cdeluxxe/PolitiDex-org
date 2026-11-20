#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-cosponsorships.mjs — the bills each member co-sponsored, from Congress.gov
// ─────────────────────────────────────────────────────────────────────────────
// Two stages, so the committed table can be checked offline:
//
//   CONGRESS_GOV_API_KEY=… node scripts/gen-cosponsorships.mjs --fetch [--congress 119]
//        PULL. For every federal member the voting-record member map ties to a
//        roster file, reads Congress.gov's own list of the measures that member
//        co-sponsored (GET /v3/member/<bioguide>/cosponsored-legislation) and
//        keeps the ones in the given Congress. Writes the normalized result to
//        db/cosponsorship-source.json (keyed by bioguide id), then derives.
//
//        --cache <dir> keeps each member's read so a stopped pull resumes;
//        --workers <n> reads that many members at once (default 12).
//
//   node scripts/gen-cosponsorships.mjs [--check]
//        DERIVE. db/cosponsorship-source.json + the roster + db/bill-docs.json
//        → db/cosponsorships.json, keyed by roster id. --check exits 1 when it
//        would change.
//
// WHO READS IT. netlify/functions/person-coverage.mts serves one person's slice
// (/api/person-coverage?pid=) to the person file and one bill's roster
// co-sponsors (/api/bill-cosponsors?bill=) to the bill page. The file is large
// enough that no page loads it whole.
//
// SEPARATE FROM "Bills sponsored". person-bills.json (scripts/gen-bill-docs.mjs)
// is the list of bills on file whose own page names the person. This is the
// member's full co-sponsor record in one Congress as Congress.gov lists it,
// most of which has no PolitiDex bill page. The two are drawn as two sections
// and neither reads the other.
//
// NOTHING IS INVENTED. Every row is a measure Congress.gov lists under that
// member's bioguide id; the title, the date introduced and the policy area are
// Congress.gov's. A member the map does not carry has no rows. Amendments (which
// the endpoint also lists, with no bill type) are left out.
// ─────────────────────────────────────────────────────────────────────────────
import { ROOT, readJson, rosterIds, bioguideMap, sortKeys, writeOrCheck } from "./coverage-core.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "db/cosponsorship-source.json";
const OUT = "db/cosponsorships.json";
const API = "https://api.congress.gov/v3";

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

// Congress.gov bill type → the citation the bill pages print.
export const CITE = { HR: "H.R.", S: "S.", HRES: "H.Res.", SRES: "S.Res.", HJRES: "H.J.Res.", SJRES: "S.J.Res.", HCONRES: "H.Con.Res.", SCONRES: "S.Con.Res." };
const PATH = { HR: "house-bill", S: "senate-bill", HRES: "house-resolution", SRES: "senate-resolution", HJRES: "house-joint-resolution", SJRES: "senate-joint-resolution", HCONRES: "house-concurrent-resolution", SCONRES: "senate-concurrent-resolution" };
const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

// One Congress.gov row → [key, record] or null.
export function rowOf(x, congress) {
  if (!x || Number(x.congress) !== congress) return null;
  const type = String(x.type || "").toUpperCase();
  if (!CITE[type] || !/^\d{1,6}$/.test(String(x.number || ""))) return null;
  const number = `${CITE[type]} ${x.number}`;
  return [`${congress}|${number}`, [String(x.title || "").replace(/\s+/g, " ").trim(), String(x.introducedDate || "").slice(0, 10), String(x.policyArea?.name || ""), `https://www.congress.gov/bill/${ord(congress)}-congress/${PATH[type]}/${x.number}`]];
}

async function fetchMember(bg, congress, key) {
  const out = [];
  for (let offset = 0; offset < 20000; offset += 250) {
    let j = null;
    for (let attempt = 0; attempt < 4 && !j; attempt++) {
      const res = await fetch(`${API}/member/${bg}/cosponsored-legislation?format=json&limit=250&offset=${offset}&api_key=${key}`);
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (res.status === 404) return out;
      if (!res.ok) throw new Error(`${bg}: HTTP ${res.status}`);
      j = await res.json();
    }
    if (!j) throw new Error(`${bg}: no answer after retries`);
    const list = j.cosponsoredLegislation || [];
    let here = 0;
    for (const x of list) { const r = rowOf(x, congress); if (r) { out.push(r); here++; } }
    // The list runs newest first; a full page with nothing from this Congress
    // (and nothing newer) means the rest is older.
    const newer = list.some((x) => Number(x.congress) > congress);
    if (list.length < 250 || (!here && !newer)) break;
  }
  return out;
}

async function pull(congress) {
  const key = process.env.CONGRESS_GOV_API_KEY;
  if (!key) throw new Error("CONGRESS_GOV_API_KEY is not set");
  const bgs = [...bioguideMap().keys()].sort();
  const bills = {};
  const members = {};
  let i = 0, failed = 0, done = 0;
  // --cache <dir>: keep each member's read on disk so a stopped pull resumes.
  const cache = flag("--cache");
  if (cache) mkdirSync(cache, { recursive: true });
  const workers = Math.max(1, Math.min(24, Number(flag("--workers") || 12)));
  const worker = async () => {
    while (i < bgs.length) {
      const bg = bgs[i++];
      try {
        const cf = cache ? join(cache, `${bg}-${congress}.json`) : "";
        let rows;
        if (cf && existsSync(cf)) rows = JSON.parse(readFileSync(cf, "utf8"));
        else { rows = await fetchMember(bg, congress, key); if (cf) writeFileSync(cf, JSON.stringify(rows)); }
        if (++done % 25 === 0) console.error(`  ${done}/${bgs.length} members read`);
        if (rows.length) {
          members[bg] = [...new Set(rows.map((r) => r[0]))].sort();
          for (const [k, rec] of rows) if (!bills[k]) bills[k] = rec;
        }
      } catch (e) { failed++; console.error(`  ${bg}: ${e.message}`); }
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
  if (failed > bgs.length * 0.05) throw new Error(`${failed} member reads failed; not writing a partial source`);
  return sortKeys({
    _comment: `WRITTEN by scripts/gen-cosponsorships.mjs --fetch from Congress.gov (GET /v3/member/<bioguide>/cosponsored-legislation) — do not edit by hand. The ${ord(congress)} Congress only. bills: "<congress>|<citation>" → [title, date introduced, policy area, Congress.gov page], all as Congress.gov lists them; members: bioguide id → the bills that member co-sponsored.`,
    congress, fetchedOn: new Date().toISOString().slice(0, 10), source: "https://api.congress.gov/v3/member/{bioguideId}/cosponsored-legislation",
    bills, members,
  });
}

// ── DERIVE ──────────────────────────────────────────────────────────────────
export function derive(source, bgMap, { pages = new Set(), names = {} } = {}) {
  const people = {};
  const used = new Set();
  for (const [bg, keys] of Object.entries(source.members || {})) {
    const pid = bgMap.get(bg);
    if (!pid) continue;
    const list = (people[pid] || []).concat(keys.filter((k) => source.bills[k]));
    people[pid] = [...new Set(list)];
    for (const k of people[pid]) used.add(k);
  }
  // Bill list newest introduced first, then by citation.
  const keys = [...used].sort((a, b) => String(source.bills[b][1]).localeCompare(String(source.bills[a][1])) || a.localeCompare(b, undefined, { numeric: true }));
  const idx = new Map(keys.map((k, n) => [k, n]));
  const bills = keys.map((k) => {
    const [title, intro, area, url] = source.bills[k];
    return [k.split("|")[1], title, intro, area, url, pages.has(k) ? 1 : 0];
  });
  const outPeople = {};
  for (const pid of Object.keys(people).sort()) outPeople[pid] = people[pid].map((k) => idx.get(k)).sort((a, b) => a - b);
  const outNames = {};
  for (const pid of Object.keys(outPeople)) if (names[pid]) outNames[pid] = names[pid];
  return {
    _comment: "GENERATED by scripts/gen-cosponsorships.mjs from db/cosponsorship-source.json — do not edit by hand. Each roster member's co-sponsored measures in one Congress, as Congress.gov lists them. bills: [citation, title, date introduced, policy area, Congress.gov page, 1 when PolitiDex has a /b/ page for it]; people: roster id → bill indexes; names: roster id → display name. Separate from person-bills.json. No score, no direction.",
    congress: source.congress, fetchedOn: source.fetchedOn || "", source: source.source || "",
    bills, people: outPeople, names: outNames,
  };
}

export function pagesFrom(root = ROOT) {
  const p = join(root, "db/bill-docs.json");
  // A ledger-published bill file (`ld`, db/bill-standard/) is not linked from
  // person files' co-sponsorship lists; the same rule as the scheduled pass.
  return existsSync(p) ? new Set(Object.entries(readJson("db/bill-docs.json", root).docs || {}).filter(([, d]) => !(d && d.ld)).map(([k]) => k)) : new Set();
}
export function namesFrom(root = ROOT) {
  const people = readJson("db/share-index.json", root).people || {};
  const out = {};
  for (const [pid, v] of Object.entries(people)) if (v && v.n) out[pid] = v.n;
  return out;
}

async function main() {
  const check = args.includes("--check");
  if (args.includes("--fetch")) {
    const congress = Number(flag("--congress") || 119);
    const src = await pull(congress);
    writeOrCheck(SOURCE, JSON.stringify(src) + "\n", { check: false });
  }
  const source = readJson(SOURCE);
  const out = derive(source, bioguideMap(ROOT, rosterIds()), { pages: pagesFrom(), names: namesFrom() });
  const okNow = writeOrCheck(OUT, JSON.stringify(out) + "\n", { check });
  if (!check) console.error(`${Object.keys(out.people).length} roster members, ${out.bills.length} co-sponsored measures`);
  process.exit(okNow ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message || e); process.exit(2); });
