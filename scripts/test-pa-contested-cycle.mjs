#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-pa-contested-cycle.mjs — Pennsylvania, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// pa-ballot-2026.js holds the contested State House and State Senate races on
// Pennsylvania's November 3, 2026 ballot and the formal acts on file for the
// people in them, each act read off a General Assembly roll call or bill page.
//
// What it pins:
//
//   1. A PENNSYLVANIA ADDRESS IN A CONTESTED SEAT names the right sitting
//      member on Who Represents Me, with at least one formal act and its
//      effect line under the row, and the door to /ballot/pa.
//   2. A SEAT WITH NO MEMBER still reads "District N — no member on file yet",
//      on the card (New York SD 12, vacant, with this file loaded) and on the
//      ballot view.
//   3. THE DATA: every act names a measure on file, a General Assembly source
//      and a person in one of the races; every incumbent is the member the
//      resolver seats on that number; every effect line keeps CONTENT_STYLE.md's
//      rules; every Senate race is an even-numbered seat.
//   4. THE BALLOT VIEW walks location → races → each name, file and acts →
//      the seat's board; a challenger with no record is named and given no file.
//   5. DISTRICT VOICE: a board opens for exactly the contested seats, each
//      printing its race; no other Pennsylvania legislative seat has a board.
//   6. THE OTHER 49 STATES ARE UNCHANGED: the card is HEAD's in every other
//      state, the roster, the resolver and the service worker are byte-identical
//      to HEAD, the existing shells are untouched and no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-pa-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ pa contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const at = (city, county, cd, sd, hd) => ({ state: "Pennsylvania", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with pa-ballot-2026.js loaded ahead of who-represents-me.js as
// index.html loads it.
const bootPA = (loc, over) => {
  const W = boot(loc, over);
  vm.runInContext(R("pa-ballot-2026.js"), W, { filename: "pa-ballot-2026.js" });
  return W;
};
const P = (() => { const w = {}; w.window = w; vm.runInContext(R("pa-ballot-2026.js"), vm.createContext(w)); return w.PDXPaBallot; })();
must(P && P.RACES && P.RACES.length >= 10, "pa-ballot-2026.js published no races");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Pennsylvania address in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Bensalem, Bucks County: State Senate 6 and State House 18, both contested.
  const W = bootPA(at("Bensalem", "Bucks County", "1", "6", "18"));
  eq(levelOf(W, "statesenate").pid, "farry_pa", "SD 6: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "tomlinson_pa", "HD 18: the sitting representative");
  const out = band(W);
  has(out, "Frank A. Farry", "SD 6: the senator is on the card");
  has(out, "Kathleen C. Tomlinson", "HD 18: the representative is on the card");
  const blocks = out.split('<div class="pdxpa-seat"').slice(1);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["farry_pa", "tomlinson_pa"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxpa-pid="${pid}"`) >= 0) || "";
    const first = P.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://www.palegis.us/", `${pid}: the act links to the General Assembly`);
    has(b, 'href="/ballot/pa"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 6 — no member on file yet", "SD 6 is named");
  lacks(out, "District 18 — no member on file yet", "HD 18 is named");
}
{
  // Lancaster: SD 36 (contested) and HD 98 — Tom Jones holds HD 98 and is the
  // SD 36 challenger. HD 98 is not one of the races, so his row carries his
  // newest act and no ballot door.
  const W = bootPA(at("Manheim", "Lancaster County", "11", "36", "98"));
  eq(levelOf(W, "statesenate").pid, "malone_pa", "SD 36: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "tom_jones_pa", "HD 98: the sitting representative");
  const out = band(W);
  const jones = out.split('<div class="pdxpa-seat"').find((x) => x.indexOf('data-pdxpa-pid="tom_jones_pa"') >= 0) || "";
  has(jones, P.actsFor("tom_jones_pa")[0].effect, "HD 98: Tom Jones's newest act is under his row");
  lacks(jones, "/ballot/pa", "HD 98 is not a race on file, so his House row has no ballot door");
}
{
  // A Pennsylvania seat outside the races: its member is a shell with no act,
  // and the row is exactly what it was.
  const loc = at("Harrisburg", "Dauphin County", "10", "15", "103");
  const now = band(bootPA(loc)), was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(now, was, "Harrisburg (SD 15, HD 103): a seat with no act on file paints HEAD's card");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a seat with no member still says nobody is on file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootPA({ state: "New York", city: "Sunnyside", county: "Queens County", district: "7",
    stateSenateDistrict: "12", stateHouseDistrict: "37", mapSelected: true });
  const out = band(W);
  has(out, "District 12 — no member on file yet", "New York SD 12 (vacant): the row says nobody is on file");
  lacks(out, "pdxpa-", "New York: no Pennsylvania block on the card");
  // The ballot view's own empty seat: a Pennsylvania level with no pid.
  const page = P.pageHtml({ located: true, state: "Pennsylvania", levels: [
    { key: "statesenate", district: "7", pid: null }, { key: "statehouse", district: "190", pid: null }] });
  has(page, "District 7 — no member on file yet", "ballot view: an empty Senate seat says nobody is on file");
  has(page, "District 190 — no member on file yet", "ballot view: an empty House seat says nobody is on file");
  has(page, "Pennsylvania elects this Senate seat in 2028", "ballot view: an odd-numbered Senate seat is not on the 2026 ballot");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootPA(at("Harrisburg", "Dauphin County", "10", "15", "103"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  for (const r of P.RACES) {
    ok(r.seat === `pa-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    if (r.chamber === "statesenate") ok(r.district % 2 === 0, `${r.seat}: Pennsylvania elects odd-numbered Senate seats in 2028, not 2026`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Pennsylvania", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party letter`);
      if (!c.pid) continue;
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Pennsylvania", `${c.pid}: a Pennsylvania roster record`);
      ok(P.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  const HOW = new Set(["Yea", "Nay", "Prime sponsor", "Co-sponsor"]);
  for (const [m, what, date, src, votes] of P.ACTS) {
    ok(!!P.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^https:\/\/www\.palegis\.us\//.test(src), `act ${m} ${what}: sourced to the General Assembly`);
    if (/passage|concurrence/i.test(what)) ok(/roll-calls\/summary\?sessYr=2025&sessInd=0&rcNum=\d+$/.test(src), `act ${m} ${what}: a roll-call summary`);
    if (/^House/.test(what)) ok(src.indexOf("/house/") >= 0, `act ${m}: a House vote reads a House roll call`);
    if (/^Senate/.test(what)) ok(src.indexOf("/senate/") >= 0, `act ${m}: a Senate vote reads a Senate roll call`);
    for (const pid in votes) {
      ok(HOW.has(votes[pid]), `act ${m} ${pid}: ${votes[pid]}`);
      ok(inRace.has(pid), `act ${m}: ${pid} is in a race`);
      const office = String((RO[pid] || {}).office || "");
      if (/^House/.test(what)) ok(/Representative/.test(office), `act ${m}: ${pid} voted in the House`);
      if (/^Senate/.test(what)) ok(/Senator/.test(office), `act ${m}: ${pid} voted in the Senate`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in P.MEASURES) {
    const m = P.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed" || m.status === "pending") ok(/^Would (?!have)/.test(e), `${k}: an act that is not law opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Act \d+A? of 20\d\d$/.test(m.act), `${k}: a law reads as done and names its act`);
    ok(/^https:\/\/www\.palegis\.us\/legislation\/bills\/2025\/[hs]b\d+$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").length > 20, `${k}: the line names what it was written from`);
  }
  // Newest first.
  for (const pid of inRace) {
    const d = P.actsFor(pid).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${pid}: acts newest first`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootPA(at("Doylestown", "Bucks County", "1", "6", "144"));
  const vw = {}; vw.window = vw; vm.runInContext(R("district-voice.js"), vm.createContext(vw), { filename: "district-voice.js" });
  W.PDXVoice = vw.PDXVoice;
  const page = W.PDXPaBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxpa-seat="pa-statesenate-6"', "the Senate race is on the page");
  has(page, 'data-pdxpa-seat="pa-statehouse-144"', "the House race is on the page");
  for (const c of [...P.race("statesenate", 6).field, ...P.race("statehouse", 144).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, P.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/pa-sd-6"', "the Senate seat's board is linked");
  has(page, 'href="/district/pa-hd-144"', "the House seat's board is linked");
  // A cold visitor with no Pennsylvania location is sent to the finder.
  const cold = P.pageHtml(null);
  has(cold, 'href="/find"', "a reader with no location is sent to the finder");
  // The finder links here; the route serves the document.
  has(R("find.html"), 'href="/ballot/pa"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/pa", "/ballot/pa/", "/ballot/pa.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-pa.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-pa.html")), "ballot-pa.html is on disk");
  has(R("ballot-pa.html"), 'id="pdx-pa-ballot"', "the ballot document carries its mount");
  has(R("ballot-pa.html"), 'src="/pa-ballot-2026.js"', "the ballot document loads the data");
  const idx = R("index.html");
  ok(idx.indexOf('src="/pa-ballot-2026.js"') >= 0 && idx.indexOf('src="/pa-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads pa-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const vw = {}; vw.window = vw; vm.runInContext(R("district-voice.js"), vm.createContext(vw), { filename: "district-voice.js" });
  const routes = vw.PDXVoice.BOARD_ROUTES;
  const paLeg = Object.keys(routes).filter((k) => /^pa-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(paLeg), JSON.stringify(P.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Pennsylvania seats");
  // Georgia's contested seats are held by test-ga-contested-cycle.mjs.
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  for (const r of P.RACES) {
    const alias = `pa-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxpa-seat="${r.seat}"`, `${doc}: prints its race`);
    for (const c of r.field) has(h, c.name.replace(/’/g, "&rsquo;").replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-pa-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, P.RACES.length, "no Pennsylvania legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!pa-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxpa-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Pennsylvania race block`);
  }
  // Read-only: none of them is on a composer list.
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "pa-hd-", `${f}: no Pennsylvania composer row`);
    lacks(R(f), "pa-sd-", `${f}: no Pennsylvania composer row`);
  }
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the other 49 states are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js",
    "db/roster-state-legislators-ny-pa-il-2026-oct.json"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD (no roster or resolver change)`);
  }
  // The worker moves exactly one version, because the location finder and the
  // board roster (both precached) changed, and precaches nothing new.
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  // A migration this pass added would have no copy at HEAD.
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  const now = bootPA({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const st of STATES) {
    for (const d of ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  // Every Pennsylvania shell is as it was.
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const B = ctx(HEAD("cmp-data.js"));
  for (const k of Object.keys(B)) if (String(B[k].state) === "Pennsylvania") eq(JSON.stringify(RO[k]), JSON.stringify(B[k]), `${k}: shell moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["pa-ballot-2026.js", "pa-ballot.css", "ballot-pa.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "find.html", "netlify.toml", "district-voice.js", "district-board.js",
    "scripts/gen-district-boards.mjs", "scripts/district-board.template.html"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-pa-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} pa contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
