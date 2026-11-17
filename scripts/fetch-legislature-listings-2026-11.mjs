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
// `--only XX[,YY]` fetches just those states and keeps every other listing
// in the committed file exactly as it is (so adding a chamber never refreshes
// the ones already covered). Such listings carry their own `fetched_on`.
//
//   node scripts/fetch-legislature-listings-2026-11.mjs [--only CA]
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
  // California Senate: the Senate's member listing. Each card links the
  // senator's own Senate homepage (https://sd<NN>.senate.ca.gov/, or
  // https://sr<NN>.senate.ca.gov/ for some Republican members), kept as `url`;
  // its host label (sd11, sr04) is the member ID.
  { state: "CA", url: "https://www.senate.ca.gov/senators", parse(body) {
    const out = [];
    for (const card of body.split('<div class="page-members__member"').slice(1)) {
      const sur = /^\s*data-name="([^"]+)"/.exec(card);
      const dist = /data-district="(\d+)"/.exec(card);
      const full = /<h3 class="member__name"[^>]*>([^<]+)<\/h3>/.exec(card);
      const home = /<a class="member__link" href="(https:\/\/(s[dr]\d{2})\.senate\.ca\.gov)\/?"[^>]*>Homepage<\/a>/.exec(card);
      if (!sur || !dist || !full || !home) throw new Error(`CA Senate: unreadable member card ${card.slice(0, 120)}`);
      // A vacant seat (data-party="V", "Member Vacant") has no member.
      if (/data-party="V"/.test(card.slice(0, 200)) || /^vacant$/i.test(decode(sur[1]))) continue;
      // Degree suffixes the listing prints after the surname ("Choi Ph.D.") are not part of it.
      const DEGREE = /,?\s+(?:M\.D\.|Ph\.D\.|J\.D\.|Ed\.D\.|D\.O\.)$/;
      const last = decode(sur[1]).replace(DEGREE, ""), name = decode(full[1]).replace(DEGREE, "");
      // "Sen. Wiener, Scott D." — the listing's surname, then the rest of its printed name.
      const first = name.endsWith(` ${last}`) ? name.slice(0, -last.length - 1).trim() : "";
      if (!first) throw new Error(`CA Senate: printed name "${name}" does not end in the listed surname "${last}"`);
      out.push({ id: home[2], chamber: "senate", name: `Sen. ${last}, ${first}`, district: String(Number(dist[1])), url: `${home[1]}/` });
    }
    return out;
  } },
];

const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > 0 ? new Set(String(process.argv[onlyArg + 1] || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)) : null;
const today = new Date().toISOString().slice(0, 10);
const PREV = ONLY && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;

const listings = {};
for (const l of LISTINGS) {
  if (ONLY && !ONLY.has(l.state)) continue;
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
for (const st of Object.values(listings)) { if (PREV) st.fetched_on = today; }
for (const st of Object.values(listings)) st.members.sort((a, b) => a.chamber.localeCompare(b.chamber) || a.id.localeCompare(b.id, "en", { numeric: true }));
const doc = {
  _note: "Sitting members read from each legislature's own member listing (sources) by scripts/fetch-legislature-listings-2026-11.mjs: legislature member ID, printed name and chamber. Input to scripts/build-raw-ingest-legislature-directory-2026-11.mjs. Re-run the fetch to refresh; never edited by hand.",
  fetched_on: PREV?.fetched_on || today,
  listings: Object.fromEntries(Object.entries({ ...(PREV?.listings || {}), ...listings }).sort(([a], [b]) => a.localeCompare(b))),
};
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
console.log(`→ ${path.relative(root, OUT)}`);
