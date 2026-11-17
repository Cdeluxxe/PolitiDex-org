#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// fetch-legislature-listings-2026-11.mjs
//
// Reads each legislature's OWN member listing (the official chamber roster
// page or data feed on the legislature's own host) and writes the sitting
// members — legislature member ID, printed name, chamber — to
// db/legislature-listings-2026-11.json. The directory build
// (scripts/build-raw-ingest-legislature-directory-2026-11.mjs) reads that
// committed file; nothing here runs in the cron.
//
// Only listings whose member links can be read from the listing itself are
// configured. Listings that are rendered by script (no member links in the
// page), refuse automated requests, or belong to a board state whose member
// pages the site never cites are not fetched; the directory build records why
// each board state is or is not covered.
//
//   node scripts/fetch-legislature-listings-2026-11.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/legislature-listings-2026-11.json");
const UA = "PolitiDex raw-ingest (+https://politidex.fyi)";

const decode = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();

const LISTINGS = [
  // Vermont: the legislature's own people feed for the 2026 biennium (JSON).
  { state: "VT", url: "https://legislature.vermont.gov/people/loadAll/2026", parse(body) {
    const rows = JSON.parse(body).data || [];
    return rows.filter((r) => !String(r.TerminationReason || "").trim() && /^[HS]$/.test(r.PersonTypeID) && /^\d+$/.test(String(r.PersonID)))
      .map((r) => ({ id: String(r.PersonID), chamber: r.PersonTypeID === "S" ? "senate" : "house",
        name: `${r.PersonTypeID === "S" ? "Sen." : "Rep."} ${decode(r.LastName)}, ${decode([r.FirstName, r.MI].filter(Boolean).join(" "))}${r.NameSuffix ? " " + decode(r.NameSuffix) : ""}` }));
  } },
  // New York State Assembly: the Assembly's member listing (each member links /mem/<id>).
  { state: "NY", url: "https://nyassembly.gov/mem/", parse(body) {
    const out = [];
    for (const m of body.matchAll(/<h3 class="mem-name"><a[^>]*href="\/mem\/([A-Za-z0-9-]+)"[^>]*>([\s\S]*?)<span>\s*District\s*(\d+)\s*<\/span>/g)) {
      out.push({ id: m[1], chamber: "house", name: decode(m[2].replace(/<[^>]+>/g, " ")), district: String(Number(m[3])) });
    }
    return out;
  } },
  // Florida Senate: the Senate's member listing (each senator links /Senators/<term>/S<n>).
  { state: "FL", url: "https://www.flsenate.gov/Senators/", parse(body) {
    const out = [];
    for (const m of body.matchAll(/<a class="senatorLink" href="\/Senators\/(\d{4}-\d{4})\/(S\d+)"[\s\S]*?>([^<>]+)<\/a>/g)) {
      out.push({ id: m[2], chamber: "senate", name: `Sen. ${decode(m[3])}`, term: m[1] });
    }
    return out;
  } },
  // Pennsylvania Senate: the Senate's member listing. Each card links the
  // member's own page (/senate/members/bio/<id>/<slug>), kept as `url`.
  { state: "PA", url: "https://www.palegis.us/senate/members", parse(body) {
    const out = [];
    for (const m of body.matchAll(/<a href="\s*(\/senate\/members\/bio\/(\d+)\/[a-z0-9-]+)"[^>]*class="thumb-info-wrapper">[\s\S]*?<span class="thumb-info-inner">([^<]+)<\/span>/g)) {
      out.push({ id: m[2], chamber: "senate", name: decode(m[3]), url: `https://www.palegis.us${m[1]}` });
    }
    return out;
  } },
];

const listings = {};
for (const l of LISTINGS) {
  const res = await fetch(l.url, { headers: { "user-agent": UA, accept: "text/html,application/json,*/*" }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${l.url} — HTTP ${res.status}`);
  const members = l.parse(await res.text());
  if (!members.length) throw new Error(`${l.url} — no members read`);
  const ids = new Set(members.map((m) => `${m.chamber}|${m.id}`));
  if (ids.size !== members.length) throw new Error(`${l.url} — duplicate member IDs`);
  (listings[l.state] ||= { sources: [], members: [] });
  listings[l.state].sources.push(l.url);
  listings[l.state].members.push(...members);
  console.log(`${l.state}: ${members.length} member(s) from ${l.url}`);
}
for (const st of Object.values(listings)) st.members.sort((a, b) => a.chamber.localeCompare(b.chamber) || a.id.localeCompare(b.id, "en", { numeric: true }));
const doc = {
  _note: "Sitting members read from each legislature's own member listing (sources) by scripts/fetch-legislature-listings-2026-11.mjs: legislature member ID, printed name and chamber. Input to scripts/build-raw-ingest-legislature-directory-2026-11.mjs. Re-run the fetch to refresh; never edited by hand.",
  fetched_on: new Date().toISOString().slice(0, 10),
  listings: Object.fromEntries(Object.entries(listings).sort(([a], [b]) => a.localeCompare(b))),
};
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
console.log(`→ ${path.relative(root, OUT)}`);
