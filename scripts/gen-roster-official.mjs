#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-roster-official.mjs — the roster, rebuilt from official sources
// ─────────────────────────────────────────────────────────────────────────────
// The live roster (cmp-data.js → roster-seats/*.js, plus seated-member.js for
// Utah's legislative seats) is curated by hand, so it drifts when members turn
// over. This generator rebuilds the same rows from the sources that define who
// holds each seat:
//
//   FEDERAL  unitedstates/congress-legislators legislators-current.json: every
//            sitting senator and representative, with bioguide id, state,
//            district, party and term dates.
//   STATE    each legislature's own member feed, one adapter per state
//            (STATE_ADAPTERS below). Today: Utah (le.utah.gov/data/
//            legislators.json) and Vermont (legislature.vermont.gov people
//            feed), the two whose feeds are machine-readable. A state without
//            an adapter keeps its current rows, and the report counts them as
//            "unverified" rather than claiming they were checked.
//
// SEATS, NOT NAMES. Every row is matched on its SEAT (chamber + state +
// district), so turnover shows up as the seat's holder changing and doesn't
// look like one member vanishing and another appearing from nowhere. Federal
// members are matched on bioguide id through db/vr-member-map.json (the same
// bioguide → roster id map the vote ingest uses).
//
// THE SAME SHAPE. The output rows are the roster-seats row shape the site
// already reads ({ name, office, state, district?, position?, party?, rank? },
// keyed by roster id, grouped by state slug). Where the official source agrees
// with the live row (same person in the same seat), the LIVE row is emitted
// byte-for-byte: the site's own office text ("House Ways & Means Chair") and
// display name stay as they are. Only a disagreement produces a row built from
// the official record, and every one is listed in the report.
//
// NOT APPLIED. This pass writes a candidate (db/official-roster-candidate.json)
// and a drift report. It does not touch cmp-data.js, roster-seats/ or
// seated-member.js. `--emit-roster-seats <dir>` writes the candidate as
// roster-seats/<state>.js files in the live file format, so a later swap is a
// copy, and the test suite can load them the way voter-hub-location.js does.
//
// THE 120TH CONGRESS. Federal terms are selected by date: a member is seated
// when one of their terms covers --as-of (default today). `--congress 120` sets
// --as-of to 2027-01-04. congress-legislators adds the new terms when members
// are sworn in, so until then a 120th run finds too few seats and REFUSES
// (exit 2) instead of writing a roster with most of Congress missing.
//
//   node scripts/gen-roster-official.mjs                     fetch, write the candidate + report
//   node scripts/gen-roster-official.mjs --check             exit 1 if the official sources disagree
//                                                            with the live roster (drift); writes nothing
//   node scripts/gen-roster-official.mjs --congress 120      the 120th Congress, once its terms are published
//   node scripts/gen-roster-official.mjs --sources <dir>     read saved source bodies instead of fetching
//   node scripts/gen-roster-official.mjs --save-sources <dir> keep what was fetched
//   node scripts/gen-roster-official.mjs --report <file.md>  write the drift report as markdown
//   node scripts/gen-roster-official.mjs --out <file>        candidate path (default db/official-roster-candidate.json)
//   node scripts/gen-roster-official.mjs --emit-roster-seats <dir>
//
// Exit: 0 = written / no drift · 1 = drift (--check) · 2 = a source failed or
// was too incomplete to trust.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildFiles, STATES, slugOf as stateSlug } from "./gen-roster-seats.mjs";
import { sameName } from "../netlify/lib/raw-ingest-resolve.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
export const OUT = "db/official-roster-candidate.json";
const UA = "PolitiDex roster check (+https://politidex.fyi)";

export const FEDERAL_SOURCE = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
// A seated Congress has 100 senators and 435 representatives (plus delegates).
// A run below this is a source that has not caught up, not turnover.
export const MIN_FEDERAL_SEATS = 480;

const USPS = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AS: "American Samoa", GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "U.S. Virgin Islands",
};
const ABBR = Object.fromEntries(Object.entries(USPS).map(([a, n]) => [n.toLowerCase(), a]));
// One-seat states: congress-legislators writes district 0, the roster writes "XX-AL".
const PARTY = { Democrat: "D", Republican: "R", Independent: "I", Libertarian: "L" };
export const slugName = (name) => String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// ── Names: an official record can carry a nickname ("Sarah "Sarita" Austin") ──
export function nameVariants(name) {
  const s = String(name || "").trim();
  const out = new Set([s.replace(/["“”]/g, "")]);
  const nick = /^(.*?)\s*["“]([^"”]+)["”]\s*(.*)$/.exec(s);
  if (nick) { out.add(`${nick[1]} ${nick[3]}`.trim()); out.add(`${nick[2]} ${nick[3]}`.trim()); }
  return [...out].map((x) => x.replace(/\s+/g, " ").replace(/,\s*(Jr|Sr|II|III|IV)\.?$/i, " $1")).filter(Boolean);
}
export const samePerson = (a, b) => nameVariants(a).some((x) => nameVariants(b).some((y) => sameName(x, y)));

// ── Seats ────────────────────────────────────────────────────────────────────
// seat key: "us-senate|OH" · "us-house|OH-14" · "state-senate|UT|5" · "state-house|VT|chittenden-2"
const normDistrict = (d) => String(d == null ? "" : d).toLowerCase()
  .replace(/\bdistrict\b/g, "").replace(/^\s*(?:sd|hd|ad|ld)\s*/i, "").replace(/\s*\(.*\)\s*$/, "")
  .replace(/[^a-z0-9]+/g, "").replace(/^0+(?=\d)/, "");
export const usHouseDistrict = (abbr, n) => `${abbr}-${Number(n) > 0 ? Number(n) : "AL"}`;

// The seat a LIVE roster row describes, read from its office/state/district text.
export function seatOfRow(pid, row, federalPids) {
  const office = String(row.office || "");
  const stateText = String(row.state || "");
  const fedDist = /\b([A-Z]{2})-(\d+|AL)\b/.exec(`${row.district || ""} ${stateText}`);
  const stName = stateText.split("·")[0].trim();
  const abbr = /^UT\b/.test(stName) ? "UT" : ABBR[stName.toLowerCase()] || (fedDist ? fedDist[1] : null);
  if (!abbr) return null;
  const federal = /^U\.S\./.test(office) || federalPids.has(pid);
  if (federal) {
    if (/senat/i.test(office) && !/house|representative/i.test(office)) return `us-senate|${abbr}`;
    if (fedDist) return `us-house|${fedDist[1]}-${fedDist[2] === "AL" ? "AL" : Number(fedDist[2])}`;
    // "state":"Nebraska","district":"2"
    if (/^\d+$/.test(String(row.district || "").trim()) && !/senat/i.test(office)) return `us-house|${abbr}-${Number(row.district)}`;
    if (/senat/i.test(office)) return `us-senate|${abbr}`;
    return null;
  }
  if (/governor/i.test(office) && !/lieutenant/i.test(office)) return `governor|${abbr}`;
  const chamber = /senat/i.test(office) ? "state-senate" : /represent|assembly|delegate|house|speaker/i.test(office) ? "state-house" : null;
  if (!chamber) return null;
  let d = row.district;
  if (!d) { const m = /District\s+(\d+)/i.exec(stateText); d = m ? m[1] : ""; }
  if (!d) return null;
  return `${chamber}|${abbr}|${normDistrict(d)}`;
}

// ── The live roster ──────────────────────────────────────────────────────────
function sandboxRows(src) {
  const w = {};
  vm.runInNewContext(src, { window: w });
  return w.PDX_SEAT_ROSTER || {};
}
function utahTables() {
  const src = R("seated-member.js");
  const out = {};
  for (const [name, chamber] of [["KR_STATE_HOUSE_INCUMBENTS", "state-house"], ["KR_STATE_SENATE_INCUMBENTS", "state-senate"], ["KR_CONGRESSIONAL_INCUMBENTS", "us-house"]]) {
    const m = new RegExp(`var ${name} = (\\{[\\s\\S]*?\\n    \\});`).exec(src);
    if (!m) throw new Error(`seated-member.js: ${name} not found`);
    const t = vm.runInNewContext(`(${m[1]})`, {});
    for (const [d, v] of Object.entries(t)) {
      const pid = typeof v === "string" ? v : v && v.pid;
      if (!pid) continue;
      out[chamber === "us-house" ? `us-house|UT-${Number(d)}` : `${chamber}|UT|${normDistrict(d)}`] = pid;
    }
  }
  return out;
}
function cmpData() {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  return ctx.CMP_DATA || {};
}

// The live roster as { states: { slug: { pid: row } }, seats: { seatKey: [pid] } }.
export function loadLiveRoster() {
  const files = buildFiles();
  const states = {};
  for (const st of STATES) states[stateSlug(st)] = sandboxRows(files[`roster-seats/${stateSlug(st)}.js`]);
  const memberMap = JSON.parse(R("db/vr-member-map.json")).map || {};
  const federalPids = new Set(Object.values(memberMap));
  // Utah's federal seats are not in roster-seats/utah.js (they resolve from the
  // live index); seated-member.js names the four House seats and cmp-data.js
  // carries the two senators.
  const C = cmpData();
  const ut = utahTables();
  for (const [seat, pid] of Object.entries(ut)) {
    if (!seat.startsWith("us-house|")) continue;
    const rec = C[pid];
    if (rec) states.utah[pid] = states.utah[pid] || { name: rec.name, office: "U.S. Representative", state: "Utah", district: seat.split("|")[1], ...(rec.party ? { party: rec.party } : {}) };
  }
  for (const [pid, rec] of Object.entries(C)) {
    if (!rec || rec.candidate === true || !/^U\.S\. Senator/.test(String(rec.office || ""))) continue;
    if (String(rec.state || "").split("·")[0].trim() !== "Utah" || !federalPids.has(pid)) continue;
    states.utah[pid] = states.utah[pid] || { name: rec.name, office: "U.S. Senator", state: "Utah", ...(rec.party ? { party: rec.party } : {}) };
  }
  const seats = {};
  const seatOf = {};
  const utByPid = Object.fromEntries(Object.entries(ut).map(([s, p]) => [p, s]));
  for (const [slug, rows] of Object.entries(states)) {
    for (const [pid, row] of Object.entries(rows)) {
      const seat = (slug === "utah" && utByPid[pid]) || seatOfRow(pid, row, federalPids);
      if (!seat) continue;
      seatOf[pid] = seat;
      (seats[seat] ||= []).push(pid);
    }
  }
  return { states, seats, seatOf, memberMap, cmp: C };
}

// ── Sources ──────────────────────────────────────────────────────────────────
async function getBody(url, name, opts) {
  if (opts.sourcesDir) {
    const p = join(opts.sourcesDir, name);
    if (!existsSync(p)) throw new Error(`${name}: not in ${opts.sourcesDir}`);
    return readFileSync(p, "utf8");
  }
  const res = await (opts.fetch || fetch)(url, { headers: { "user-agent": UA, accept: "application/json,*/*" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${url} — HTTP ${res.status}`);
  const body = await res.text();
  if (opts.saveDir) { mkdirSync(opts.saveDir, { recursive: true }); writeFileSync(join(opts.saveDir, name), body); }
  return body;
}

// congress-legislators → official federal seats on a date.
// A term that ended within this many days, with no successor in the source, is
// "unconfirmed" rather than "left": congress-legislators records a special
// election's winner some days after the appointed term's scheduled end.
export const ENDED_GRACE_DAYS = 120;
export function endedTerms(legislators, asOf) {
  const out = {};
  const floor = new Date(Date.parse(asOf) - ENDED_GRACE_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const p of legislators || []) {
    const terms = p.terms || [];
    if (terms.some((x) => x.start <= asOf && asOf < x.end)) continue;
    const t = terms[terms.length - 1];
    if (!t || !(t.end <= asOf && t.end > floor) || !p.id?.bioguide) continue;
    out[p.id.bioguide] = { end: t.end, seat: t.type === "sen" ? `us-senate|${t.state}` : `us-house|${usHouseDistrict(t.state, t.district)}` };
  }
  return out;
}
export function federalSeats(legislators, asOf) {
  const out = [];
  for (const p of legislators || []) {
    const t = (p.terms || []).find((x) => x.start <= asOf && asOf < x.end);
    if (!t || !USPS[t.state]) continue;
    const name = p.name?.official_full || [p.name?.first, p.name?.last].filter(Boolean).join(" ");
    const seat = t.type === "sen" ? `us-senate|${t.state}` : `us-house|${usHouseDistrict(t.state, t.district)}`;
    out.push({
      seat, bioguide: p.id?.bioguide || null, name, party: PARTY[t.party] || (t.party ? String(t.party)[0] : null),
      stateAbbr: t.state, office: t.type === "sen" ? "U.S. Senator" : (t.district === 0 && /^(AS|GU|MP|PR|VI|DC)$/.test(t.state) ? "U.S. Delegate" : "U.S. Representative"),
      district: t.type === "sen" ? null : usHouseDistrict(t.state, t.district), rank: t.state_rank || null,
    });
  }
  return out;
}

// One adapter per legislature feed: (body) → [{ seat, name, party, office, district, chamber }].
export const STATE_ADAPTERS = {
  UT: {
    url: "https://le.utah.gov/data/legislators.json",
    file: "ut.json",
    parse(body) {
      return (JSON.parse(body).legislators || []).filter((m) => (m.house === "H" || m.house === "S") && m.district).map((m) => {
        const chamber = m.house === "S" ? "state-senate" : "state-house";
        return { seat: `${chamber}|UT|${normDistrict(m.district)}`, name: m.formatName || m.fullName, party: m.party || null, chamber,
          office: m.house === "S" ? "Utah State Senator" : "Utah State Representative", district: `${m.house === "S" ? "SD" : "HD"} ${Number(m.district)}`, sourceId: m.id };
      });
    },
  },
  VT: {
    // The legislature's people feed for the current biennium (the year the
    // biennium ends; 2025-2026 → 2026). Members with a TerminationReason have left.
    url: (asOf) => `https://legislature.vermont.gov/people/loadAll/${Number(asOf.slice(0, 4)) + (Number(asOf.slice(0, 4)) % 2)}`,
    file: "vt.json",
    parse(body) {
      return (JSON.parse(body).data || []).filter((m) => /^[HS]$/.test(m.PersonTypeID) && !String(m.TerminationReason || "").trim()).map((m) => {
        const chamber = m.PersonTypeID === "S" ? "state-senate" : "state-house";
        const district = String(m.District || "").replace(/\s+District$/i, "").trim();
        const first = String(m.FirstName || "").trim();
        return { seat: `${chamber}|VT|${normDistrict(district)}`, name: [first, m.MI ? `${m.MI}.` : "", m.LastName, m.NameSuffix].filter(Boolean).join(" ").replace(/\s+/g, " "),
          party: String(m.PartyID || "").split("/")[0] || null, chamber,
          office: m.PersonTypeID === "S" ? "Vermont State Senator" : "Vermont State Representative", district, sourceId: String(m.PersonID) };
      });
    },
  },
};

// ── The build ────────────────────────────────────────────────────────────────
const stateNameOf = (abbr) => USPS[abbr];
const slugForAbbr = (abbr) => stateSlug(USPS[abbr] || abbr);

const partyLetter = (p) => String(p || "").trim().charAt(0).toUpperCase();

export function buildCandidate({ live, federal, stateMembers, asOf, sources, ended = {} }) {
  const states = JSON.parse(JSON.stringify(live.states));
  const drift = [];          // { kind, seat, pid?, name?, detail }
  const verified = new Set(); // seats checked against an official source
  const bioToPid = live.memberMap;
  const pidToBio = Object.fromEntries(Object.entries(bioToPid).map(([b, p]) => [p, b]));
  // A roster record (often a candidate row) for the same person in the same state.
  const cmpByState = {};
  for (const [pid, rec] of Object.entries(live.cmp || {})) {
    const st = String(rec?.state || "").split("·")[0].split("-")[0].trim();
    const abbr = /^UT\b/.test(st) ? "UT" : ABBR[st.toLowerCase()] || (/^[A-Z]{2}$/.test(st) ? st : null);
    if (abbr) (cmpByState[abbr] ||= []).push(pid);
  }
  const usedPids = new Set(Object.values(states).flatMap((r) => Object.keys(r)));
  const newPid = (name, abbr) => {
    let base = slugName(name); let p = base;
    if (usedPids.has(p) || live.cmp[p]) p = `${base}_${abbr.toLowerCase()}`;
    let i = 2; while (usedPids.has(p) || live.cmp[p]) p = `${base}_${abbr.toLowerCase()}${i++}`;
    usedPids.add(p);
    return p;
  };
  const removeFromLive = (pid, why, seat) => {
    const e = ended[pidToBio[pid]];
    if (e && e.seat === seat) { drift.push({ kind: "unconfirmed", seat, pid, name: live.states[slugOfPid(pid)]?.[pid]?.name || "", detail: `term ended ${e.end}; the source names no successor yet — row kept` }); return; }
    for (const rows of Object.values(states)) if (rows[pid]) { delete rows[pid]; drift.push({ kind: "left", seat, pid, name: live.states[slugOfPid(pid)]?.[pid]?.name || "", detail: why }); return; }
  };
  const slugOfPid = (pid) => Object.keys(live.states).find((s) => live.states[s][pid]);

  // Group official members by seat (multi-member districts hold several).
  const groups = {};
  for (const m of [...federal, ...stateMembers]) (groups[m.seat] ||= []).push(m);

  const officialPids = new Set();
  for (const [seat, members] of Object.entries(groups)) {
    verified.add(seat);
    const [kind, a, b] = seat.split("|");
    const abbr = kind.startsWith("us-") ? a.slice(0, 2) : a;
    const slug = slugForAbbr(abbr);
    if (!states[slug]) continue; // territories: the site carries no seat file for them
    const holders = [...(live.seats[seat] || [])];
    for (const m of members) {
      // Federal: bioguide first; then a name match against the seat's live holders.
      let pid = m.bioguide && bioToPid[m.bioguide] ? bioToPid[m.bioguide] : null;
      if (pid && !slugOfPid(pid)) {
        // Mapped, but the live roster has no seat row for them (e.g. a Utah member resolved elsewhere).
        if (!holders.includes(pid)) pid = holders.find((h) => samePerson(live.states[slugOfPid(h)]?.[h]?.name, m.name)) || pid;
      }
      if (!pid) pid = holders.find((h) => samePerson(live.states[slugOfPid(h)]?.[h]?.name, m.name)) || null;
      // Not seated anywhere on the live roster, but the roster has a record for
      // them in this state (typically their candidate row): reuse that id.
      if (!pid) pid = (cmpByState[abbr] || []).find((p) => samePerson(live.cmp[p]?.name, m.name)) || null;
      const liveRow = pid ? live.states[slugOfPid(pid)]?.[pid] : null;
      const liveSeat = pid ? live.seatOf[pid] : null;
      if (pid && liveRow && liveSeat === seat) {
        // Same person, same seat: keep the live row as it is. Party is the one
        // fact both carry that can change without a seat change.
        officialPids.add(pid);
        if (m.party && liveRow.party && partyLetter(liveRow.party) !== partyLetter(m.party)) drift.push({ kind: "party", seat, pid, name: liveRow.name, detail: `${liveRow.party} → ${m.party}` });
        continue;
      }
      // A different seat, a new person, or a person the roster never seated.
      const id = pid || newPid(m.name, abbr);
      officialPids.add(id);
      const row = { name: liveRow?.name || live.cmp?.[pid]?.name || m.name, office: m.office, state: stateNameOf(abbr) };
      if (m.district) row.district = m.district;
      if (m.party) row.party = m.party;
      if (pid && liveRow && slugOfPid(pid) !== slug) delete states[slugOfPid(pid)][pid];
      states[slug][id] = row;
      drift.push(pid
        ? { kind: liveSeat ? "moved" : "seated", seat, pid: id, name: row.name, detail: liveSeat ? `${liveSeat} → ${seat}` : liveRow ? "live row does not name this seat" : `on the roster (${live.cmp?.[pid]?.office || "no seat row"}), but no seat row seats them` }
        : { kind: "new", seat, pid: id, name: m.name, detail: "not on the roster; id proposed" });
    }
    // Live holders of this seat the official source does not name.
    for (const h of holders) if (!officialPids.has(h)) removeFromLive(h, "the official source no longer lists them in this seat", seat);
  }
  // Live seats in a verified class that the source never mentions at all (a
  // vacancy, or a district that no longer exists).
  const verifiedClasses = new Set([...verified].map((s) => s.split("|")[0] === "us-house" || s.split("|")[0] === "us-senate" ? s.split("|")[0] : `${s.split("|")[0]}|${s.split("|")[1]}`));
  for (const [seat, pids] of Object.entries(live.seats)) {
    if (verified.has(seat)) continue;
    const [kind, a] = seat.split("|");
    const cls = kind.startsWith("us-") ? kind : `${kind}|${a}`;
    if (!verifiedClasses.has(cls)) continue;
    for (const pid of pids) if (!officialPids.has(pid)) removeFromLive(pid, "the official source lists nobody in this seat (vacant or redrawn)", seat);
  }

  const liveCount = Object.values(live.seats).reduce((n, p) => n + p.length, 0);
  const verifiedRows = Object.entries(live.seats).filter(([s]) => verified.has(s)).reduce((n, [, p]) => n + p.length, 0);
  const unverified = {};
  for (const [seat, pids] of Object.entries(live.seats)) {
    if (verified.has(seat)) continue;
    const [kind, a] = seat.split("|");
    if (verifiedClasses.has(kind.startsWith("us-") ? kind : `${kind}|${a}`)) continue;
    const k = kind.startsWith("us-") ? kind : `${kind} ${a}`;
    unverified[k] = (unverified[k] || 0) + pids.length;
  }
  const kindCount = {};
  for (const d of drift) kindCount[d.kind] = (kindCount[d.kind] || 0) + 1;
  return {
    _note: "GENERATED by scripts/gen-roster-official.mjs from official sources. A CANDIDATE, not the live roster: cmp-data.js / roster-seats/ / seated-member.js are unchanged. Rows are the roster-seats row shape; a row the official source agrees with is the live row unchanged.",
    asOf,
    sources,
    summary: {
      liveSeatRows: liveCount,
      verifiedSeatRows: verifiedRows,
      unverifiedSeatRows: liveCount - verifiedRows,
      unverifiedByClass: Object.fromEntries(Object.entries(unverified).sort()),
      officialFederalSeats: federal.length,
      officialStateSeats: stateMembers.length,
      drift: kindCount,
      // "unconfirmed" is the source lagging, not the roster: it does not count.
      matches: drift.every((d) => d.kind === "unconfirmed"),
    },
    drift: drift.sort((x, y) => x.seat.localeCompare(y.seat) || String(x.pid).localeCompare(String(y.pid))),
    states: Object.fromEntries(Object.entries(states).map(([s, rows]) => [s, Object.fromEntries(Object.keys(rows).sort().map((k) => [k, rows[k]]))])),
  };
}

export function reportMarkdown(c) {
  const s = c.summary;
  const L = [`### Roster vs official sources (as of ${c.asOf})`, ""];
  L.push(`${s.verifiedSeatRows} of ${s.liveSeatRows} live seat rows were checked against an official source; ${s.unverifiedSeatRows} have no official adapter yet.`, "");
  if (s.matches) L.push("**No drift.** Every checked seat is held by the member the roster names.", "");
  else {
    L.push(`**Drift:** ${Object.entries(s.drift).map(([k, n]) => `${n} ${k}`).join(", ")}.`, "", "| kind | seat | roster id | name | detail |", "|---|---|---|---|---|");
    for (const d of c.drift.slice(0, 300)) L.push(`| ${d.kind} | ${d.seat} | \`${d.pid}\` | ${d.name} | ${d.detail} |`);
    if (c.drift.length > 300) L.push(`| … | ${c.drift.length - 300} more | | | |`);
    L.push("");
  }
  if (Object.keys(s.unverifiedByClass).length) L.push(`Unverified (no official adapter): ${Object.entries(s.unverifiedByClass).map(([k, n]) => `${k} ${n}`).join(" · ")}.`, "");
  return L.join("\n") + "\n";
}

// The candidate as roster-seats/<state>.js files, in the live file format.
export function rosterSeatFiles(c) {
  const out = {};
  for (const st of STATES) {
    const slug = stateSlug(st);
    const rows = c.states[slug] || {};
    const body = Object.keys(rows).map((pid) => `    ${JSON.stringify(pid)}: ${JSON.stringify(rows[pid])}`).join(",\n");
    out[`${slug}.js`] =
`/* roster-seats/${slug}.js — CANDIDATE from scripts/gen-roster-official.mjs (official sources, ${c.asOf}). Not live. */
(function () {
  'use strict';
  var T = window.PDX_SEAT_ROSTER = window.PDX_SEAT_ROSTER || {};
  var rows = {
${body}
  };
  for (var k in rows) { if (Object.prototype.hasOwnProperty.call(rows, k) && !T[k]) T[k] = rows[k]; }
  var L = window.PDX_SEAT_ROSTER_STATES = window.PDX_SEAT_ROSTER_STATES || {};
  L[${JSON.stringify(slug)}] = true;
  if (typeof window._pdxSeatRosterLanded === 'function') window._pdxSeatRosterLanded(${JSON.stringify(slug)});
})();
`;
  }
  return out;
}

export async function generate(opts = {}) {
  const asOf = opts.asOf || new Date().toISOString().slice(0, 10);
  const live = opts.live || loadLiveRoster();
  const sources = { federal: FEDERAL_SOURCE };
  const legislators = JSON.parse(await getBody(FEDERAL_SOURCE, "legislators-current.json", opts));
  const federal = federalSeats(legislators, asOf);
  const ended = endedTerms(legislators, asOf);
  if (federal.length < (opts.minFederalSeats ?? MIN_FEDERAL_SEATS)) {
    const e = new Error(`congress-legislators has only ${federal.length} seats with a term covering ${asOf} (need ${opts.minFederalSeats ?? MIN_FEDERAL_SEATS}) — the source has not caught up with that Congress yet`);
    e.code = "INCOMPLETE"; throw e;
  }
  const stateMembers = [];
  for (const [abbr, a] of Object.entries(STATE_ADAPTERS)) {
    const url = typeof a.url === "function" ? a.url(asOf) : a.url;
    sources[abbr] = url;
    const members = a.parse(await getBody(url, a.file, opts));
    if (!members.length) { const e = new Error(`${abbr}: ${url} returned no members`); e.code = "INCOMPLETE"; throw e; }
    stateMembers.push(...members);
  }
  return buildCandidate({ live, federal, stateMembers, asOf, sources, ended });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const congress = arg("--congress") ? Number(arg("--congress")) : null;
  // A Congress convenes at noon on Jan 3 of its first (odd) year; the 4th is the first full day.
  const asOf = arg("--as-of") || (congress ? `${1789 + 2 * (congress - 1)}-01-04` : null);
  const opts = { asOf, sourcesDir: arg("--sources") ? resolve(arg("--sources")) : null, saveDir: arg("--save-sources") ? resolve(arg("--save-sources")) : null };
  let c;
  try { c = await generate(opts); }
  catch (e) { console.error(`✗ gen-roster-official: ${e.message}`); process.exit(2); }
  const md = reportMarkdown(c);
  if (arg("--report")) writeFileSync(arg("--report"), md);
  const s = c.summary;
  console.log(`gen-roster-official: as of ${c.asOf} — ${s.officialFederalSeats} federal + ${s.officialStateSeats} state official seats; ${s.verifiedSeatRows}/${s.liveSeatRows} live rows checked; drift ${JSON.stringify(s.drift)}`);
  if (argv.includes("--check")) {
    if (!s.matches) { process.stdout.write(md); process.exit(1); }
    console.log("✓ the live roster matches the official sources for every checked seat");
    process.exit(0);
  }
  const out = resolve(ROOT, arg("--out") || OUT);
  writeFileSync(out, JSON.stringify(c, null, 1) + "\n");
  console.log(`→ ${arg("--out") || OUT}`);
  if (arg("--emit-roster-seats")) {
    const dir = resolve(arg("--emit-roster-seats"));
    mkdirSync(dir, { recursive: true });
    for (const [f, src] of Object.entries(rosterSeatFiles(c))) writeFileSync(join(dir, f), src);
    console.log(`→ ${dir}/ (${STATES.length} candidate roster-seats files)`);
  }
}
