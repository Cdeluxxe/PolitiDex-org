#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-committees.mjs — committee memberships on person files, from the chambers
// ─────────────────────────────────────────────────────────────────────────────
// Two stages, so the committed table can be checked offline:
//
//   node scripts/gen-committees.mjs --fetch [--house-xml f] [--senate-xml f]
//        PULL. Reads the two official membership files and writes their
//        normalized contents to db/committee-source.json (then derives).
//          House   https://clerk.house.gov/xml/lists/MemberData.xml
//                  (Office of the Clerk: every member's committee and
//                  subcommittee assignments, rank, and any leadership title,
//                  plus the committee names)
//          Senate  https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml
//                  (Senate LIS: every senator's committee assignments)
//        --house-xml / --senate-xml read a saved copy instead of the network.
//
//   node scripts/gen-committees.mjs [--check]
//        DERIVE. db/committee-source.json + the roster → db/person-committees.json.
//        --check exits 1 when db/person-committees.json would change.
//
// NOTHING IS INVENTED. A membership is listed only when the official file lists
// it for that member's bioguide id, and the member's bioguide id maps to a
// roster record through db/vr-member-map.json. A roster person the files do not
// cover (a state legislator, a governor, a candidate) has no entry, and the
// person file shows no committee section for them — never "none". A title
// (Chair, Ranking Member, Vice Chair) is printed only as the House file states
// it; the Senate file carries no committee titles, so none are printed for
// senators. Committee names are the files' own.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { ROOT, readJson, rosterIds, bioguideMap, sortKeys, writeOrCheck, xmlAttrs, xmlChild, xmlBlocks, xmlText } from "./coverage-core.mjs";

export const HOUSE_URL = "https://clerk.house.gov/xml/lists/MemberData.xml";
export const SENATE_URL = "https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml";
const SOURCE = "db/committee-source.json";
const OUT = "db/person-committees.json";

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

// ── PULL: the House Clerk's MemberData.xml ──────────────────────────────────
export function parseHouse(xml) {
  const src = String(xml);
  const cut = src.indexOf("</members>");
  const membersPart = cut >= 0 ? src.slice(0, cut) : src;
  const committeesPart = cut >= 0 ? src.slice(cut) : "";
  const published = (/<MemberData[^>]*publish-date="([^"]*)"/.exec(src) || [])[1] || "";
  const congress = Number(xmlChild(src.slice(0, 2000), "congress-num")) || null;

  const committees = {};
  for (const c of xmlBlocks(committeesPart, "committee")) {
    const code = c.attrs.comcode;
    if (!/^[A-Z]{2}\d{2}$/.test(code || "")) continue;
    const name = xmlChild(c.body, "committee-fullname");
    if (name) committees[code] = { n: name, ch: c.attrs.type === "joint" ? "joint" : "house", t: c.attrs.type || "" };
    for (const sm of c.body.matchAll(/<subcommittee(\s[^>]*)>([\s\S]*?)<\/subcommittee>/g)) {
      const sa = xmlAttrs(sm[1]);
      const sn = xmlChild(sm[2], "subcommittee-fullname");
      if (/^[A-Z]{2}\d{2}$/.test(sa.subcomcode || "") && sn) committees[sa.subcomcode] = { n: sn, ch: "house", t: "subcommittee", p: code };
    }
  }

  const members = {};
  for (const m of xmlBlocks(membersPart, "member")) {
    const bg = xmlChild(m.body, "bioguideID");
    if (!/^[A-Z]\d{6}$/.test(bg)) continue;
    const ca = (/<committee-assignments>([\s\S]*?)<\/committee-assignments>/.exec(m.body) || [])[1] || "";
    const rows = [];
    for (const a of ca.matchAll(/<(committee|subcommittee)(\s[^>]*?)\/?>/g)) {
      const at = xmlAttrs(a[2]);
      const code = a[1] === "committee" ? at.comcode : at.subcomcode;
      if (!/^[A-Z]{2}\d{2}$/.test(code || "")) continue;
      rows.push([code, at.rank ? Number(at.rank) || null : null, at.leadership || null]);
    }
    if (rows.length) members[bg] = rows;
  }
  return { url: HOUSE_URL, published, congress, committees, members };
}

// ── PULL: the Senate's cvc_member_data.xml ──────────────────────────────────
export function parseSenate(xml) {
  const src = String(xml);
  const updated = xmlText(((/<lastUpdate>([\s\S]*?)<\/lastUpdate>/.exec(src) || [])[1] || "").replace(/<[^>]+>/g, " "));
  const committees = {};
  const members = {};
  for (const s of xmlBlocks(src, "senator")) {
    const bg = xmlChild(s.body, "bioguideId");
    if (!/^[A-Z]\d{6}$/.test(bg)) continue;
    const rows = [];
    for (const c of s.body.matchAll(/<committee(\s[^>]*)>([\s\S]*?)<\/committee>/g)) {
      const code = xmlAttrs(c[1]).code;
      const name = xmlText(c[2]);
      if (!/^[A-Z]{4}\d{2}$/.test(code || "") || !name) continue;
      committees[code] = { n: name, ch: /^J/.test(code) ? "joint" : "senate", t: /^SP/.test(code) ? "special" : /^J/.test(code) ? "joint" : "standing" };
      rows.push([code, null, null]);
    }
    if (rows.length) members[bg] = rows;
  }
  return { url: SENATE_URL, updated, committees, members };
}

async function getText(url) {
  const res = await fetch(url, { headers: { "user-agent": "PolitiDex committee generator (public records reader)" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

export function sourceFrom(house, senate, fetchedOn) {
  return sortKeys({
    _comment: "WRITTEN by scripts/gen-committees.mjs --fetch from the official membership files — do not edit by hand. house: the House Clerk's MemberData.xml (assignments [code, rank, leadership title as printed]); senate: the Senate LIS cvc_member_data.xml (assignments [code, null, null]; the file carries no titles). Members keyed by bioguide id.",
    fetchedOn,
    house,
    senate,
  });
}

// ── DERIVE: source + roster → db/person-committees.json ───────────────────────
export function derive(source, bgMap) {
  const committees = {};
  const people = {};
  const used = new Set();
  for (const chamber of ["house", "senate"]) {
    const s = source[chamber];
    if (!s) continue;
    for (const [bg, rows] of Object.entries(s.members || {})) {
      const pid = bgMap.get(bg);
      if (!pid) continue;
      const list = people[pid] || (people[pid] = []);
      for (const [code, rank, lead] of rows) {
        const c = s.committees[code];
        if (!c) continue; // a code with no name in the file is not printed
        used.add(`${chamber}|${code}`);
        if (c.p) used.add(`${chamber}|${c.p}`);
        const row = [code];
        if (lead) row.push(lead);
        if (!list.some((r) => r[0] === code)) list.push(row);
      }
    }
  }
  for (const k of [...used].sort()) {
    const [chamber, code] = k.split("|");
    const c = source[chamber].committees[code];
    const row = [c.n, c.ch];
    if (c.p) row.push(c.p);
    committees[code] = row;
  }
  // Committees before their subcommittees, each in code order.
  for (const pid of Object.keys(people)) {
    people[pid].sort((a, b) => {
      const pa = committees[a[0]][2] || a[0], pb = committees[b[0]][2] || b[0];
      return pa.localeCompare(pb) || (committees[a[0]][2] ? 1 : 0) - (committees[b[0]][2] ? 1 : 0) || a[0].localeCompare(b[0]);
    });
  }
  return {
    _comment: "GENERATED by scripts/gen-committees.mjs from db/committee-source.json — do not edit by hand. Committee memberships as the official files list them: the House Clerk's MemberData.xml and the Senate LIS cvc_member_data.xml. committees: code → [name as printed, chamber (house | senate | joint), parent committee code for a subcommittee]; people: roster id → [[code, leadership title as the House file prints it]]. Only members the voting-record member map ties to a roster file. No score, no ranking.",
    sources: {
      house: { url: source.house?.url || HOUSE_URL, asOf: source.house?.published || "", congress: source.house?.congress || null },
      senate: { url: source.senate?.url || SENATE_URL, asOf: source.senate?.updated || "" },
      fetchedOn: source.fetchedOn || "",
    },
    committees,
    people: sortKeys(people),
  };
}

export const render = (o) => JSON.stringify(o) + "\n";

async function main() {
  const check = args.includes("--check");
  if (args.includes("--fetch")) {
    const hf = flag("--house-xml"), sf = flag("--senate-xml");
    const house = parseHouse(hf ? readFileSync(hf, "utf8") : await getText(HOUSE_URL));
    const senate = parseSenate(sf ? readFileSync(sf, "utf8") : await getText(SENATE_URL));
    if (Object.keys(house.members).length < 400 || Object.keys(senate.members).length < 90) {
      throw new Error(`refusing a short read: ${Object.keys(house.members).length} House, ${Object.keys(senate.members).length} Senate members`);
    }
    const src = sourceFrom(house, senate, new Date().toISOString().slice(0, 10));
    writeOrCheck(SOURCE, JSON.stringify(src, null, 1) + "\n", { check: false });
  }
  const source = readJson(SOURCE);
  const out = derive(source, bioguideMap());
  const okNow = writeOrCheck(OUT, render(out), { check });
  if (!check) console.error(`${Object.keys(out.people).length} roster people with committee assignments`);
  process.exit(okNow ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message || e); process.exit(2); });
