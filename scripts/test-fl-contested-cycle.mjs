#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-fl-contested-cycle.mjs — Florida, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// fl-ballot-2026.js holds the Florida House and Florida Senate races on
// Florida's November 3, 2026 ballot that Florida reporting covers as real
// contests with a sitting member running, and the formal acts on file for the
// people in them, each a recorded floor vote read from the bill's vote record
// on flsenate.gov and linked to it. Every incumbent is an existing thin shell;
// the roster does not move.
//
// What it pins:
//
//   1. A FLORIDA LOCATION IN A CONTESTED SEAT names the right sitting member
//      on Who Represents Me, with at least one formal act and its effect line
//      under the row, and the door to /ballot/fl.
//   2. A VACANT OR UNCONTESTED SEAT: House 113 (vacant, no member on the
//      roster) reads "District 113 — no member on file yet"; Senate 4 (held,
//      on the ballot, unopposed) shows its sitting member with no act block
//      and no board; Senate 37 (held, odd-numbered) is elected in 2028.
//   3. THE DATA: every act names a measure on file, a vote record on
//      flsenate.gov and a person in one of the races; every incumbent is the
//      member the resolver seats; every Senate race is an even-numbered seat;
//      every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with a record and no roster row (Josie Tomkow) gets acts and
//      no file; one with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Florida legislative seat has
//      one, and the six earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the six earlier contested cycles
//      included; the roster, resolver, existing shells and the earlier states'
//      data are byte-identical; the worker moved one version and precaches
//      nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-fl-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band, settled, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ fl contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js", "wi-ballot-2026.js"];
const BALLOTS = [...EARLIER, "fl-ballot-2026.js"];
const FLS = "https://www.flsenate.gov/Session/Bill/";

const at = (city, county, cd, sd, hd) => ({ state: "Florida", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all seven ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootFL = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("fl-ballot-2026.js"), vm.createContext(w)); return w.PDXFlBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "fl-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Florida location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Tampa: Senate 14 and House 65, both contested.
  const W = bootFL(at("Tampa", "Hillsborough County", "14", "14", "65"));
  eq(levelOf(W, "statesenate").pid, "nathan_fl", "SD 14: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "gonzalez_pittman_fl", "HD 65: the sitting representative");
  const out = band(W);
  has(out, "Brian Nathan", "SD 14: the senator is on the card");
  has(out, "Karen Gonzalez Pittman", "HD 65: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["nathan_fl", "gonzalez_pittman_fl"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxfl-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, FLS, `${pid}: the act links to the Legislature`);
    has(b, "/Vote/", `${pid}: the act links to its vote record`);
    has(b, 'href="/ballot/fl"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 14 — no member on file yet", "SD 14 is named");
  lacks(out, "District 65 — no member on file yet", "HD 65 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Jacksonville", "Duval County", "4", "4", "113");
  const W = bootFL(loc);
  eq(levelOf(W, "statesenate").pid, "yarborough_fl", "SD 4: the sitting member");
  eq(levelOf(W, "statehouse").pid, null, "HD 113: no member is named");
  const out = band(W);
  has(out, "District 113 — no member on file yet", "HD 113: the row says nobody is on file");
  has(out, W.CMP_DATA.yarborough_fl.name, "SD 4: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "SD 4 / HD 113: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("fl-statesenate-4"), "", "SD 4: no board");
  eq(V.boardPath("fl-statehouse-113"), "", "HD 113: no board");
  eq(V.boardPath("fl-statesenate-37"), "", "SD 37: no board");
  ok(!N.race("statesenate", 4), "SD 4 is not one of the races on file");
  const page = W.PDXFlBallot.pageHtml({ located: true, state: "Florida", levels: [
    { key: "statesenate", district: "37", pid: "pizzo_fl" }, { key: "statehouse", district: "113", pid: null }] });
  has(page, "District 113 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, W.CMP_DATA.pizzo_fl.name, "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a House seat with no race says so");
  has(page, "Florida elects this Senate seat in 2028.", "ballot view: an odd-numbered Senate seat is not on the 2026 ballot");
  lacks(page, "/district/fl-sd-37", "ballot view: no board for SD 37");
  const q = W.PDXFlBallot.pageHtml({ located: true, state: "Florida", levels: [{ key: "statesenate", district: "4", pid: "yarborough_fl" }] });
  has(q, "Not one of the contested races on file for this ballot.", "ballot view: an even-numbered Senate seat with no race says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootFL(at("Jacksonville", "Duval County", "4", "4", "113"));
const RO = W0.CMP_DATA;
const KEY_OFFICE = { "@tomkow": "Representative" };
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `fl-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    if (r.chamber === "statesenate") ok(r.district % 2 === 0, `${r.seat}: Florida elects odd-numbered Senate seats in 2028, not 2026`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Florida", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:[RDGLI]|NPA)$/.test(c.party), `${r.seat} ${c.name}: party`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key] && !!KEY_OFFICE[c.key], `${c.key}: a name key is not a roster id`); ok(N.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); continue; }
      if (!c.pid) { eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Florida", `${c.pid}: a Florida roster record`);
      eq(RO[c.pid] && RO[c.pid].name, c.name, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, path, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^(19|20)\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    if (!ok(/^20\d\d[A-Z]?\/\d+[A-Z]?\/Vote\/(?:House|Senate)Vote_[a-z0-9_]+\.PDF$/i.test(path), `act ${m}: a vote record`)) continue;
    const bill = N.MEASURES[m].source.slice(FLS.length);
    ok(path.indexOf(bill.split("/")[0] + "/" + bill.split("/")[1]) === 0, `act ${m}: the vote record is the measure's own`);
    ok(/^(House|Senate) /.test(what), `act ${m}: the action names its chamber`);
    eq(/^House/.test(what), /\/HouseVote_/.test(path), `act ${m}: the action's chamber is the vote record's`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (not voting and excused are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || KEY_OFFICE[who] || "");
      if (/^House/.test(what)) ok(/Representative/.test(office), `act ${m}: ${who} voted in the House`);
      if (/^Senate/.test(what)) ok(/Senator/.test(office), `act ${m}: ${who} voted in the Senate`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in N.MEASURES) {
    const m = N.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e.replace(/\b20\d\d–\d\d\b/g, "")), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Approved by the Governor (?:with line-item vetoes )?[A-Z][a-z]+\.? \d{1,2}, 20\d\d \(Chapter 20\d\d-\d+\)$/.test(m.act), `${k}: a law reads as done and names its chapter`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.flsenate\.gov\/Session\/Bill\/20\d\d[A-Z]?\/\d+$/.test(m.source), `${k}: the bill page`);
    ok(/^(?:Enrolled|Bill) title: “/.test(String(m.from || "")), `${k}: the line names the title it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(a.source.indexOf(FLS) === 0 && /\/Vote\//.test(a.source), `${who} ${a.measure}: links its vote record`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootFL(at("Tampa", "Hillsborough County", "14", "14", "65"));
  W.PDXVoice = voice();
  const page = W.PDXFlBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxfl-seat="fl-statesenate-14"', "the Senate race is on the page");
  has(page, 'data-pdxfl-seat="fl-statehouse-65"', "the House race is on the page");
  for (const c of [...N.race("statesenate", 14).field, ...N.race("statehouse", 65).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, N.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  const tOwn = (page.split('data-pdxfl-cand="@tomkow"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(tOwn, N.MEASURES["SB 2-C (2025C)"].effect, "Josie Tomkow: her House act is listed");
  lacks(tOwn, "’s file", "Josie Tomkow: no file is linked");
  lacks(page, 'href="/p/@', "no keyed challenger has a file address");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  const bOwn = (page.split('data-pdxfl-cand="Ben Braver"')[1] || "").split('<li class="pdxpa-cand"')[0];
  lacks(bOwn, 'href="/p/', "Ben Braver: no file");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/fl-sd-14"', "the Senate seat's board is linked");
  has(page, 'href="/district/fl-hd-65"', "the House seat's board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(N.raceHtml(N.race("statesenate", 38)), "(NPA)", "a no-party name keeps its label");
  has(R("find.html"), 'href="/ballot/fl"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/fl", "/ballot/fl/", "/ballot/fl.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-fl.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-fl.html")), "ballot-fl.html is on disk");
  const doc = R("ballot-fl.html");
  has(doc, 'id="pdx-fl-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/fl-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio", "Wisconsin"]) lacks(doc, st, `the Florida ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/fl-ballot-2026.js"') >= 0 && idx.indexOf('src="/fl-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads fl-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const flLeg = Object.keys(routes).filter((k) => /^fl-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(flLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Florida seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `fl-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    // The contested-boards voice pass opened the composer and the poll here,
    // behind the gate every voiced board shares.
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxfl-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/fl"', `${doc}: links the Florida ballot view`);
    has(h, `<h1 class="pdxdb-h1">Florida ${r.chamber === "statesenate" ? "Senate" : "House"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-fl-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Florida legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!fl-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxfl-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Florida race block`);
  }
  // Exactly the contested seats are on the composer's three lists (the
  // contested-boards voice pass), and no other Florida legislative seat.
  {
    const want = N.RACES.map((r) => `fl-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`).sort();
    for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
      const got = [...new Set([...R(f).matchAll(/["'](fl-(?:hd|sd)-\d+)["']/g)].map((x) => x[1]))].sort();
      eq(JSON.stringify(got), JSON.stringify(want), `${f}: exactly the contested Florida seats take a voice`);
    }
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh|wi)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-fl-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "db/roster-state-legislators-ca-tx-fl-2026-oct.json"]) {
    ok(settled(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's six earlier ballot files, against today's with all seven.
  const now = bootFL({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the six earlier states, so their act rows are
  // compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"],
    Michigan: ["9", "35", "27", "28", "44", "46", "55", "61", "86", "109"],
    Ohio: ["29", "10", "17", "36", "60", "12", "89"],
    Wisconsin: ["17", "31", "26", "30", "51", "61", "85", "88", "89", "91", "92", "94", "27", "76"] };
  for (const st of STATES) {
    for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  // Florida itself: every seat outside the races reads as HEAD's card did.
  const raced = new Set(N.RACES.map((r) => r.seat));
  for (const d of ["1", "4", "37", "51", "113", "120"]) {
    if (raced.has(`fl-statesenate-${d}`) || raced.has(`fl-statehouse-${d}`)) continue;
    const loc = at("", "", "1", d, d);
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `Florida seat ${d}: the card changed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["fl-ballot-2026.js", "ballot-fl.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-fl-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} fl contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
