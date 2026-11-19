#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-roster-official.mjs — the official-source roster generator
// ─────────────────────────────────────────────────────────────────────────────
// Pins scripts/gen-roster-official.mjs offline (fixtures only, no network):
//   1. ROUND TRIP: official feeds that say exactly what the live roster says
//      produce NO drift and a candidate whose rows are the live rows, byte for byte
//   2. TURNOVER: a seat whose holder changed shows "left" + "new" on that SEAT,
//      and the new row has the roster-seats shape
//   3. a candidate row of the roster (a CMP record) who is now seated is reused,
//      not given a second id
//   4. a term that ended with no successor in the source is "unconfirmed": the
//      row is kept and it does not count as drift
//   5. the 120th Congress (or any date the source has not caught up with) is
//      REFUSED rather than written with most seats missing
//   6. the state adapters read their feeds (Utah, Vermont), nicknames included
//   7. the emitted roster-seats files load the way voter-hub-location.js loads them
//   8. the committed candidate exists, is the row shape, and the live roster
//      files were not touched by it
//
//   node scripts/test-roster-official.mjs
import { readFileSync, mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as G from "./gen-roster-official.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const clone = (x) => JSON.parse(JSON.stringify(x));

const live = G.loadLiveRoster();
const bio = Object.fromEntries(Object.entries(live.memberMap).map(([b, p]) => [p, b]));
const AS_OF = "2026-11-19";

// Official feeds rebuilt FROM the live roster: every federal seat the live
// roster names (with a bioguide id), every Utah and Vermont legislative seat.
function mirrorFeeds(l) {
  const federal = [], state = [];
  for (const [seat, pids] of Object.entries(l.seats)) {
    const [kind, a] = seat.split("|");
    for (const pid of pids) {
      const row = Object.values(l.states).find((r) => r[pid])[pid];
      if (kind.startsWith("us-") && bio[pid]) federal.push({ seat, bioguide: bio[pid], name: row.name, party: row.party || null, office: kind === "us-senate" ? "U.S. Senator" : "U.S. Representative", district: kind === "us-house" ? a : null });
      if (kind.startsWith("state-") && (a === "UT" || a === "VT")) state.push({ seat, name: row.name, party: row.party || null, office: row.office, district: row.district || null });
    }
  }
  return { federal, state };
}

// 1. round trip
{
  const { federal, state } = mirrorFeeds(live);
  ok(federal.length > 400 && state.length > 250, `mirror feeds are substantial (${federal.length} federal, ${state.length} state)`);
  const c = G.buildCandidate({ live, federal, stateMembers: state, asOf: AS_OF, sources: {} });
  eq(c.drift, [], "round trip: no drift");
  ok(c.summary.matches, "round trip: summary.matches");
  let same = true;
  for (const [slug, rows] of Object.entries(live.states)) for (const [pid, row] of Object.entries(rows)) if (JSON.stringify(c.states[slug]?.[pid]) !== JSON.stringify(row)) { same = false; failures.push(`round trip changed ${slug}/${pid}`); }
  ok(same, "round trip: every live row is emitted unchanged");
  eq(Object.values(c.states).reduce((n, r) => n + Object.keys(r).length, 0), Object.values(live.states).reduce((n, r) => n + Object.keys(r).length, 0), "round trip: same row count");
}

// 2. turnover on a Utah House seat, keyed by seat not name
{
  const { federal, state } = mirrorFeeds(live);
  const seat = "state-house|UT|22";
  const holder = live.seats[seat][0];
  const st = state.filter((m) => m.seat !== seat).concat([{ seat, name: "Quinn Newcomer", party: "D", office: "Utah State Representative", district: "HD 22" }]);
  const c = G.buildCandidate({ live, federal, stateMembers: st, asOf: AS_OF, sources: {} });
  const kinds = c.drift.filter((d) => d.seat === seat).map((d) => d.kind).sort();
  eq(kinds, ["left", "new"], "turnover: the seat reports left + new");
  ok(!c.states.utah[holder], "turnover: the outgoing holder's row is gone from the candidate");
  const row = c.states.utah.quinn_newcomer;
  ok(row && row.name === "Quinn Newcomer" && row.office === "Utah State Representative" && row.district === "HD 22", "turnover: the incoming row is built from the official record");
  const FIELDS = ["name", "office", "state", "district", "position", "party", "rank"];
  ok(row && Object.keys(row).every((k) => FIELDS.includes(k)), "turnover: the new row uses only roster-seats fields");
  ok(!c.summary.matches, "turnover counts as drift");
}

// 3. a roster candidate row now seated keeps its id
{
  const L = clone(live);
  L.cmp = { ...live.cmp, pat_challenger: { name: "Pat Challenger", office: "U.S. House Candidate", state: "Ohio", candidate: true } };
  const { federal, state } = mirrorFeeds(live);
  const seat = "us-house|OH-14";
  const fed = federal.filter((m) => m.seat !== seat).concat([{ seat, bioguide: "Z000001", name: "Pat Challenger", party: "R", office: "U.S. Representative", district: "OH-14" }]);
  const c = G.buildCandidate({ live: L, federal: fed, stateMembers: state, asOf: AS_OF, sources: {} });
  const d = c.drift.find((x) => x.seat === seat && x.kind !== "left");
  eq(d && [d.kind, d.pid], ["seated", "pat_challenger"], "a CMP candidate record now seated keeps its roster id");
  eq(c.states.ohio.pat_challenger && c.states.ohio.pat_challenger.district, "OH-14", "and gets a seat row");
}

// 4. ended term, no successor in the source
{
  const legislators = [
    { id: { bioguide: "M001244" }, name: { official_full: "Ashley Moody" }, terms: [{ type: "sen", state: "FL", start: "2025-01-21", end: "2026-11-03", party: "Republican" }] },
    { id: { bioguide: "S001217" }, name: { official_full: "Rick Scott" }, terms: [{ type: "sen", state: "FL", start: "2025-01-03", end: "2031-01-03", party: "Republican" }] },
  ];
  eq(G.federalSeats(legislators, AS_OF).map((m) => m.name), ["Rick Scott"], "federalSeats picks the term covering the date");
  eq(G.endedTerms(legislators, AS_OF), { M001244: { end: "2026-11-03", seat: "us-senate|FL" } }, "endedTerms lists the term that just ended");
  const { federal, state } = mirrorFeeds(live);
  const moody = live.memberMap.M001244;
  const fed = federal.filter((m) => m.bioguide !== "M001244");
  const c = G.buildCandidate({ live, federal: fed, stateMembers: state, asOf: AS_OF, sources: {}, ended: G.endedTerms(legislators, AS_OF) });
  const d = c.drift.find((x) => x.pid === moody);
  eq(d && d.kind, "unconfirmed", "ended term with no successor → unconfirmed");
  ok(c.states.florida[moody], "and the row is kept");
  ok(c.summary.matches, "unconfirmed alone is not drift");
}

// 5. refuse a Congress the source has not published
{
  const dir = mkdtempSync(join(tmpdir(), "roster-official-"));
  writeFileSync(join(dir, "legislators-current.json"), JSON.stringify([
    { id: { bioguide: "S001217" }, name: { official_full: "Rick Scott" }, terms: [{ type: "sen", state: "FL", start: "2025-01-03", end: "2031-01-03", party: "Republican" }] },
  ]));
  let err = null;
  try { await G.generate({ asOf: "2027-01-04", sourcesDir: dir, live }); } catch (e) { err = e; }
  eq(err && err.code, "INCOMPLETE", "120th Congress before its terms are published → refused (INCOMPLETE)");
  ok(err && /has not caught up/.test(err.message), "the refusal says why");
}

// 6. adapters
{
  const ut = G.STATE_ADAPTERS.UT.parse(JSON.stringify({ legislators: [
    { formatName: "Thomas W. Peterson", id: "PETERT", house: "H", party: "R", district: "1" },
    { formatName: "Scott D. Sandall", id: "SANDAS", house: "S", party: "R", district: "1" },
  ] }));
  eq(ut.map((m) => [m.seat, m.office, m.district]), [["state-house|UT|1", "Utah State Representative", "HD 1"], ["state-senate|UT|1", "Utah State Senator", "SD 1"]], "Utah adapter");
  const vt = G.STATE_ADAPTERS.VT.parse(JSON.stringify({ data: [
    { PersonID: "1", PersonTypeID: "H", FirstName: 'Sarah "Sarita"', MI: "", LastName: "Austin", NameSuffix: "", PartyID: "D", District: "Chittenden-19", TerminationReason: "" },
    { PersonID: "2", PersonTypeID: "S", FirstName: "Philip", MI: "E", LastName: "Baruth", NameSuffix: "", PartyID: "D/P", District: "Chittenden-Central District", TerminationReason: "" },
    { PersonID: "3", PersonTypeID: "H", FirstName: "Gone", MI: "", LastName: "Member", NameSuffix: "", PartyID: "R", District: "Orange-1", TerminationReason: "Resigned" },
  ] }));
  eq(vt.map((m) => [m.seat, m.party]), [["state-house|VT|chittenden19", "D"], ["state-senate|VT|chittendencentral", "D"]], "Vermont adapter (departed members dropped)");
  ok(G.samePerson('Sarah "Sarita" Austin', "Sarita Austin"), "a quoted nickname matches the name the roster uses");
  ok(!G.samePerson("Sarita Austin", "Richard Bailey"), "different people do not match");
  eq(G.STATE_ADAPTERS.VT.url("2027-02-01"), "https://legislature.vermont.gov/people/loadAll/2028", "Vermont feed follows the biennium (2027-2028 → 2028)");
}

// 7. emitted files load the way the site loads roster-seats/<state>.js
{
  const { federal, state } = mirrorFeeds(live);
  const c = G.buildCandidate({ live, federal, stateMembers: state, asOf: AS_OF, sources: {} });
  const files = G.rosterSeatFiles(c);
  eq(Object.keys(files).length, 51, "one file per state");
  const w = {};
  let landed = [];
  w._pdxSeatRosterLanded = (s) => landed.push(s);
  vm.runInNewContext(files["ohio.js"], { window: w });
  ok(w.PDX_SEAT_ROSTER && Object.keys(w.PDX_SEAT_ROSTER).length === Object.keys(live.states.ohio).length, "ohio.js fills PDX_SEAT_ROSTER with every row");
  eq(landed, ["ohio"], "and announces itself the same way");
}

// 8. committed candidate; the live roster is not replaced
{
  const c = JSON.parse(readFileSync(join(ROOT, G.OUT), "utf8"));
  ok(/CANDIDATE/.test(c._note), "candidate file says it is not live");
  ok(c.summary && c.summary.officialFederalSeats >= G.MIN_FEDERAL_SEATS, "candidate was built from a full federal source");
  ok(c.states && Object.keys(c.states).length === 51, "candidate carries all 51 state slugs");
  const FIELDS = new Set(["name", "office", "state", "district", "position", "party", "rank"]);
  let shape = true;
  for (const rows of Object.values(c.states)) for (const r of Object.values(rows)) if (!r.name || !r.office || Object.keys(r).some((k) => !FIELDS.has(k))) shape = false;
  ok(shape, "every candidate row has the roster-seats shape");
  for (const f of readdirSync(join(ROOT, "roster-seats"))) ok(/GENERATED by scripts\/gen-roster-seats\.mjs/.test(readFileSync(join(ROOT, "roster-seats", f), "utf8")), `roster-seats/${f} is still gen-roster-seats' output`);
  const src = readFileSync(join(ROOT, "scripts/gen-roster-official.mjs"), "utf8");
  ok(!/writeFileSync\([^)]*(cmp-data|seated-member|roster-seats\/)/.test(src), "the generator never writes the live roster files");
}

if (failures.length) { console.error(`✗ ${failures.length} failure(s):\n  ${failures.slice(0, 30).join("\n  ")}`); process.exit(1); }
console.log(`✓ test-roster-official: ${passed} checks passed`);
