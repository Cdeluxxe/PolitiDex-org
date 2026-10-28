#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ca-contested-cycle.mjs — California, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// ca-ballot-2026.js holds the contested State Senate and State Assembly races
// on California's November 3, 2026 ballot that CalMatters names as races to
// watch with a sitting member running, the two names the Secretary of State's
// certified list prints for each (the primary is top-two), and the formal
// acts on file for the people in them, each a final floor vote read from the
// bill's Votes page on leginfo.legislature.ca.gov and linked to it. Every
// sitting member already had a roster row, so cmp-data.js does not move.
//
// What it pins:
//
//   1. A CALIFORNIA LOCATION IN A CONTESTED SEAT names the right sitting
//      members on Who Represents Me, with at least one formal act and its
//      effect line under each row, and the door to /ballot/ca.
//   2. A VACANT OR UNCONTESTED SEAT: Senate 10 and Assembly 50 read "District
//      N — no member on file yet"; Senate 11 and Assembly 1 (held, not
//      contested) show their sitting members with no act block and no board.
//   3. THE DATA: every race lists exactly the certified names and parties;
//      every act names a measure on file, a Votes page on leginfo and a person
//      in one of the races; every incumbent is the member the resolver seats;
//      every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board.
//   5. DISTRICT VOICE: a board opens for exactly the contested seats, each
//      printing its race; no other California legislative seat has one, and
//      the fourteen earlier states' boards are unchanged.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD; the roster, the resolver and the
//      earlier states' data are byte-identical; the worker moved one version
//      and precaches nothing new; the one migration is the declared seed.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-ca-contested-cycle.mjs

import { R, HEAD, AT, PRE_CA_WA, boot, levelOf, band, settled, DECLARED_MIGRATIONS } from "./state-leg-harness.mjs";
// What THIS pass added is measured against the commit it was built on, so the
// check stays exact after the pass lands; "nothing else moved" stays on HEAD.
const BASE = AT(PRE_CA_WA);
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { contestedSeats } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const lacks = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ ca contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js",
  "wi-ballot-2026.js", "fl-ballot-2026.js", "az-ballot-2026.js", "ny-ballot-2026.js", "tx-ballot-2026.js", "il-ballot-2026.js",
  "mn-ballot-2026.js", "co-ballot-2026.js", "nv-ballot-2026.js"];
const BALLOTS = [...EARLIER, "ca-ballot-2026.js"];
const LEGINFO = "https://leginfo.legislature.ca.gov/faces/";
const SOS = "https://elections.cdn.sos.ca.gov/statewide-elections/2026-general/cert-list-candidates.pdf";
const MIGRATION = "20261201000000_dd_districts_california_contested_board_seats.sql";

// Every candidate on the November 3, 2026 general-election ballot in each
// contested seat, as the Secretary of State's Official Certified List of
// Candidates (Aug. 27, 2026) prints them.
const FILED = {
  "ca-statesenate-16": [["Melissa Hurtado", "D"], ["Guillermo Asuncion Gonzalez", "R"]],
  "ca-statesenate-38": [["Catherine S. Blakespear", "D"], ["Laura Bassett", "R"]],
  "ca-statehouse-7": [["Josh Hoover", "R"], ["Amy L. Slavensky", "D"]],
  "ca-statehouse-36": [["Jeff Gonzalez", "R"], ["Ida S. Obeso-Martinez", "D"]],
  "ca-statehouse-47": [["Greg Wallis", "R"], ["Leila Namvar", "D"]],
  "ca-statehouse-58": [["Leticia Castillo", "R"], ["Clarissa Cervantes", "D"]],
  "ca-statehouse-74": [["Laurie Davies", "R"], ["Sergio Farias", "D"]],
};

const C = (() => { const w = {}; w.window = w; vm.runInContext(R("ca-ballot-2026.js"), vm.createContext(w)); return w.PDXCaBallot; })();
must(C && C.RACES && C.RACES.length >= 4, "ca-ballot-2026.js published no races");
const at = (city, county, cd, sd, ad) => ({ state: "California", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: ad, mapSelected: true });
// The real card, with all fifteen ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootCA = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };
const headCard = (loc) => {
  const W = boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), W, { filename: f + "@HEAD" });
  return band(W);
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a California location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // North San Diego County coast: Senate 38 and Assembly 74, both contested.
  const W = bootCA(at("Oceanside", "San Diego County", "49", "38", "74"));
  eq(levelOf(W, "statesenate").pid, "blakespear_ca", "SD 38: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "davies_ca", "AD 74: the sitting Assembly member");
  const out = band(W);
  has(out, "Catherine S. Blakespear", "SD 38: the senator is on the card");
  has(out, "Laurie Davies", "AD 74: the Assembly member is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["blakespear_ca", "davies_ca"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxca-pid="${pid}"`) >= 0) || "";
    const first = C.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, esc(first.effect), `${pid}: the newest act's effect line is under the row`);
    has(b, LEGINFO, `${pid}: the act links to the Legislature's own site`);
    has(b, 'href="/ballot/ca"', `${pid}: the row opens the ballot view`);
  }
  for (const r of C.RACES) {
    const inc = r.field.find((c) => c.incumbent);
    const loc = r.chamber === "statesenate" ? at("", "", "1", String(r.district), "50") : at("", "", "1", "10", String(r.district));
    const Wr = bootCA(loc);
    eq(levelOf(Wr, r.chamber).pid, inc.pid, `${r.seat}: the sitting member`);
    const b = actBlocks(band(Wr)).find((x) => x.indexOf(`data-pdxca-pid="${inc.pid}"`) >= 0) || "";
    has(b, esc(C.actsFor(inc.pid)[0].effect), `${r.seat}: an effect line under the row`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("", "", "1", "10", "50");
  const W = bootCA(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 10: no member is named");
  eq(levelOf(W, "statehouse").pid, null, "AD 50: no member is named");
  const out = band(W);
  has(out, "District 10 — no member on file yet", "SD 10: the row says nobody is on file");
  has(out, "District 50 — no member on file yet", "AD 50: the row says nobody is on file");
  eq(actBlocks(out).length, 0, "an empty seat carries no act block");
  eq(out, headCard(loc), "SD 10 / AD 50: the card is HEAD's");
  const loc2 = at("San Francisco", "San Francisco County", "11", "11", "1");
  const W2 = bootCA(loc2);
  eq(levelOf(W2, "statesenate").pid, "wiener_ca", "SD 11: the sitting member");
  eq(levelOf(W2, "statehouse").pid, "hadwick_ca", "AD 1: the sitting member");
  eq(actBlocks(band(W2)).length, 0, "an uncontested seat carries no act block");
  eq(band(W2), headCard(loc2), "SD 11 / AD 1: the card is HEAD's");
  const V = voice();
  for (const s of ["ca-statesenate-11", "ca-statesenate-10", "ca-statesenate-14", "ca-statehouse-1", "ca-statehouse-12", "ca-statehouse-27", "ca-statehouse-50"]) {
    eq(V.boardPath(s), "", `${s}: no board`);
  }
  ok(!C.onBallot2026("statesenate", 11), "SD 11 is not on the 2026 ballot");
  ok(C.onBallot2026("statesenate", 38) && C.onBallot2026("statehouse", 1), "every Assembly seat and the even Senate seats are");
  const page = W.PDXCaBallot.pageHtml({ located: true, state: "California", levels: [
    { key: "statesenate", district: "11", pid: "wiener_ca" }, { key: "statehouse", district: "50", pid: null },
    { key: "statehouse", district: "1", pid: "hadwick_ca" }] });
  has(page, "District 50 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Scott Wiener", "ballot view: an uncontested seat shows its sitting member");
  has(page, "State Assembly District 1", "ballot view: the lower chamber is called the Assembly");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  has(page, "this California Senate seat is elected in 2028", "ballot view: a Senate seat not up this year says so");
  lacks(page, "pdxpa-board", "ballot view: no board door for a seat with no race");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: names, acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootCA(at("", "", "1", "10", "50"));
const RO = W0.CMP_DATA;
{
  eq(JSON.stringify(C.RACES.map((r) => r.seat).sort()), JSON.stringify(Object.keys(FILED).sort()), "the races are exactly the filed seats");
  const inRace = new Set();
  for (const r of C.RACES) {
    ok(r.seat === `ca-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(C.onBallot2026(r.chamber, r.district), `${r.seat}: on the 2026 ballot`);
    ok(/^https:\/\/calmatters\.org\/california-voter-guide-2026\/state-(?:assembly|senate)\/$/.test(r.source), `${r.seat}: who-is-running source`);
    eq(r.filed, SOS, `${r.seat}: the Secretary of State's certified list`);
    eq(JSON.stringify(r.field.map((c) => [c.name, c.party])), JSON.stringify(FILED[r.seat] || []), `${r.seat}: every name and party on the ballot`);
    eq(r.field.length, 2, `${r.seat}: a top-two race has two names`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("California", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    for (const c of r.field) {
      ok(/^(?:D|R)$/.test(c.party), `${r.seat} ${c.name}: party`);
      if (!c.pid) {
        eq(C.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`);
        continue;
      }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "California", `${c.pid}: a California roster record`);
      const last = c.name.split(" ").pop();
      ok(RO[c.pid] && RO[c.pid].name.indexOf(last) >= 0, `${c.pid}: the roster name is the race's`);
      ok(C.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, votes] of C.ACTS) {
    ok(!!C.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(Assembly|Senate) (?:concurrence, )?final passage$/.test(what), `act ${m}: the action names its chamber`);
    const senate = /^Senate/.test(what);
    for (const who in votes) {
      ok(votes[who] === "Aye" || votes[who] === "No", `act ${m} ${who}: ${votes[who]} (not voting is not an act)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (senate) ok(office === "California State Senator", `act ${m}: ${who} voted in the Senate`);
      else ok(office === "California State Assembly Member", `act ${m}: ${who} voted in the Assembly`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in C.MEASURES) {
    const m = C.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e.replace(/\b20\d\d–\d\d\b/g, "")), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    eq(m.status, "law", `${k}: chaptered`);
    ok(!/^Would/.test(e), `${k}: a law reads as done`);
    ok(/^(?:Approved|Filed) [A-Z][a-z]+\.? \d{1,2}, 20\d\d \((?:Res\. )?Chapter \d+\)$/.test(m.act), `${k}: names its chapter`);
    const id = (/bill_id=(202520260(?:SB|AB|ACA)\d+)$/.exec(m.source) || [])[1];
    ok(!!id && m.source === `${LEGINFO}billNavClient.xhtml?bill_id=${id}`, `${k}: the bill's page on leginfo`);
    eq(m.votes, `${LEGINFO}billVotesClient.xhtml?bill_id=${id}`, `${k}: the bill's Votes page on leginfo`);
    ok(/^(?:Title|Digest): /.test(String(m.from || "")), `${k}: the line names the text it was written from`);
  }
  for (const who of inRace) {
    const d = C.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of C.actsFor(who)) ok(/billVotesClient/.test(a.source), `${who} ${a.measure}: the act links its Votes page`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootCA(at("Oceanside", "San Diego County", "49", "38", "74"));
  W.PDXVoice = voice();
  const page = W.PDXCaBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxca-seat="ca-statesenate-38"', "the Senate race is on the page");
  has(page, 'data-pdxca-seat="ca-statehouse-74"', "the Assembly race is on the page");
  has(page, "State Assembly District 74", "the lower chamber is called the Assembly");
  for (const c of [...C.race("statesenate", 38).field, ...C.race("statehouse", 74).field]) {
    has(page, esc(c.name), `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      for (const a of C.actsFor(c.pid)) has(page, esc(a.effect), `${c.name}: ${a.measure}'s effect line`);
    }
  }
  for (const nm of ["Laura Bassett", "Sergio Farias"]) {
    const own = (page.split(`data-pdxca-cand="${nm}"`)[1] || "").split('<li class="pdxpa-cand"')[0];
    ok(own.length > 0, `${nm}: listed`);
    lacks(own, 'href="/p/', `${nm}: no file`);
    has(own, "No formal act on file.", `${nm}: no formal act on file`);
  }
  has(page, 'href="/district/ca-sd-38"', "the Senate seat's board is linked");
  has(page, 'href="/district/ca-hd-74"', "the Assembly seat's board is linked");
  for (const r of C.RACES) {
    const h = C.raceHtml(r);
    for (const c of r.field) {
      has(h, `${esc(c.name)}${c.pid ? "</a>" : "</span>"} <span class="pdxpa-party">(${c.party})</span>`, `${r.seat}: ${c.name} and party`);
    }
    has(h, `href="${esc(r.filed)}"`, `${r.seat}: the official list is linked`);
  }
  has(C.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/ca"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/ca", "/ballot/ca/", "/ballot/ca.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-ca.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-ca.html")), "ballot-ca.html is on disk");
  const doc = R("ballot-ca.html");
  has(doc, 'id="pdx-ca-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/ca-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "Nevada", "NELIS", "Texas", "Minnesota", "Colorado"]) lacks(doc, st, `the California ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/ca-ballot-2026.js"') >= 0 && idx.indexOf('src="/ca-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads ca-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const caLeg = Object.keys(routes).filter((k) => /^ca-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(caLeg), JSON.stringify(C.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested California seats");
  ok(!Object.keys(routes).some((k) => /^ca-(?:gov|statewide)/.test(k)), "no statewide California room");
  const HVR = (() => { const w = {}; w.window = w; vm.runInContext(HEAD("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  for (const k of Object.keys(HVR)) eq(routes[k], HVR[k], `${k}: an earlier board moved`);
  const BVR = (() => { const w = {}; w.window = w; vm.runInContext(BASE("district-voice.js"), vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  const added = Object.keys(routes).filter((k) => !BVR[k] && /^ca-/.test(k)).sort();
  eq(JSON.stringify(added), JSON.stringify(caLeg), "the only new boards are California's contested seats");
  ok(Object.keys(routes).every((k) => HVR[k]), "BOARD_ROUTES holds no board beyond HEAD's");
  const CONTESTED = contestedSeats();
  for (const k of added) ok(CONTESTED.has(k), `${k}: a board with no race behind it`);
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of C.RACES) {
    const alias = `ca-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, true, `${alias}: takes a voice`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxca-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/ca"', `${doc}: links the California ballot view`);
    has(h, `<h1 class="pdxdb-h1">California ${r.chamber === "statesenate" ? "Senate" : "Assembly"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, esc(c.name), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, esc(C.actsFor(inc.pid)[0].effect), `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-ca-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, C.RACES.length, "no California legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!ca-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxca-seat=") >= 0) ok(false, `${f}: a board outside the races carries a California race block`);
    if (HEAD(f) === null && /^district-wa-(?:hd|sd)-\d+(?:-p\d)?\.html$/.test(f)) continue;
    ok(R(f) === HEAD(f), `${f}: an earlier board document moved`);
  }
  const TOML = R("netlify.toml");
  ok(![...TOML.matchAll(/from = "([^"]+)"/g)].some((m) => /^\/district\/.*\*/.test(m[1])), "no /district/* splat");
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html",
    "ballot-nc.html", "ballot-mi.html", "ballot-oh.html", "ballot-wi.html", "ballot-fl.html", "ballot-az.html",
    "ballot-ny.html", "ballot-tx.html", "ballot-il.html", "ballot-mn.html", "ballot-co.html", "ballot-nv.html"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /^roster-/.test(f))) eq(R(`db/${f}`), HEAD(`db/${f}`), `db/${f}: byte-identical to HEAD`);
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  ok(DECLARED_MIGRATIONS.includes(MIGRATION), "the California seed is a declared migration");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null || DECLARED_MIGRATIONS.includes(f), `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  const now = bootCA({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  const NAMES = { pa: "Pennsylvania", ga: "Georgia", nc: "North Carolina", mi: "Michigan", oh: "Ohio", wi: "Wisconsin",
    fl: "Florida", az: "Arizona", ny: "New York", tx: "Texas", il: "Illinois", mn: "Minnesota", co: "Colorado", nv: "Nevada" };
  const SEATS = {};
  for (const f of EARLIER) {
    const code = f.slice(0, 2);
    const w = {}; w.window = w; vm.runInContext(R(f), vm.createContext(w));
    const M = w[`PDX${code[0].toUpperCase()}${code[1]}Ballot`];
    SEATS[NAMES[code]] = [...new Set(M.RACES.map((r) => String(r.district)))];
  }
  eq(Object.keys(SEATS).length, 14, "fixture: the fourteen earlier contested states");
  const cmp = (st, sd, hd) => {
    const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true };
    now._currentVoterLocation = Object.assign({}, loc);
    was._currentVoterLocation = Object.assign({}, loc);
    eq(band(now), band(was), `${st} seat ${sd}/${hd}: the card changed`);
  };
  for (const st of STATES) for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) cmp(st, d, d);
  // California itself: every seat outside the races reads as HEAD's card did.
  for (const [sd, ad] of [["1", "1"], ["11", "50"], ["2", "2"], ["10", "12"], ["40", "27"], ["14", "80"]]) cmp("California", sd, ad);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["ca-ballot-2026.js", "ballot-ca.html", `netlify/database/migrations/${MIGRATION}`]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "district-composer.js", "district-poll.js", "sw.js", "scripts/gen-district-boards.mjs",
    "netlify/functions/district-board.mts", "netlify/lib/district-board-voice-core.mjs", "netlify/lib/seat-holders.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-ca-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} ca contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
