#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ga-contested-cycle.mjs — Georgia, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// ga-ballot-2026.js holds the contested State House and State Senate races on
// Georgia's November 3, 2026 ballot and the formal acts on file for the people
// in them, each a recorded floor vote read from the Georgia General Assembly's
// site (legis.ga.gov) and linked to the bill page that lists it.
//
// What it pins:
//
//   1. A GEORGIA LOCATION IN A CONTESTED SEAT names the right sitting member on
//      Who Represents Me, with at least one formal act and its effect line under
//      the row, and the door to /ballot/ga.
//   2. A VACANT OR UNCONTESTED SEAT: Georgia SD 42 (no member on the roster)
//      reads "District 42 — no member on file yet"; an uncontested seat shows
//      its sitting member with no act block and no race board.
//   3. THE DATA: every act names a measure on file, a legis.ga.gov bill page and
//      a person in one of the races; every incumbent is the member the resolver
//      seats; every effect line keeps CONTENT_STYLE.md's rules.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with a record and no roster row (Farooq Mughal) gets acts and
//      no file; one with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested seats,
//      each printing its race; no other Georgia legislative seat has a board.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD; the roster, resolver and existing
//      shells are byte-identical; the worker moved one version and precaches
//      nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-ga-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band } from "./state-leg-harness.mjs";
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
const must = (c, m) => { if (!c) { console.error(`✗ ga contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;

const at = (city, county, cd, sd, hd) => ({ state: "Georgia", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with both ballot files loaded ahead of who-represents-me.js
// as index.html loads them.
const bootGA = (loc, over) => {
  const W = boot(loc, over);
  for (const f of ["pa-ballot-2026.js", "ga-ballot-2026.js"]) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const G = (() => { const w = {}; w.window = w; vm.runInContext(R("ga-ballot-2026.js"), vm.createContext(w)); return w.PDXGaBallot; })();
must(G && G.RACES && G.RACES.length >= 8, "ga-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Georgia location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A Gwinnett County location placed in State Senate 48 and State House 99,
  // both contested.
  const W = bootGA(at("Duluth", "Gwinnett County", "7", "48", "99"));
  eq(levelOf(W, "statesenate").pid, "still_ga", "SD 48: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "reeves_ga", "HD 99: the sitting representative");
  const out = band(W);
  has(out, "Shawn Still", "SD 48: the senator is on the card");
  has(out, "Matt Reeves", "HD 99: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["still_ga", "reeves_ga"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxga-pid="${pid}"`) >= 0) || "";
    const first = G.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://www.legis.ga.gov/legislation/", `${pid}: the act links to the General Assembly`);
    has(b, 'href="/ballot/ga"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 48 — no member on file yet", "SD 48 is named");
  lacks(out, "District 99 — no member on file yet", "HD 99 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  // SD 42 has no member on the roster; HD 58 is held (Park Cannon) and is not
  // one of the races.
  const loc = at("Atlanta", "DeKalb County", "5", "42", "58");
  const W = bootGA(loc);
  eq(levelOf(W, "statesenate").pid, null, "SD 42: no member is named");
  eq(levelOf(W, "statehouse").pid, "park_cannon_ga", "HD 58: the sitting member");
  const out = band(W);
  has(out, "District 42 — no member on file yet", "SD 42: the row says nobody is on file");
  has(out, "Park Cannon", "HD 58: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "an uncontested or empty seat carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "SD 42 / HD 58: the card is HEAD's");
  const vw = {}; vw.window = vw; vm.runInContext(R("district-voice.js"), vm.createContext(vw), { filename: "district-voice.js" });
  eq(vw.PDXVoice.boardPath("ga-statesenate-42"), "", "SD 42: no board");
  eq(vw.PDXVoice.boardPath("ga-statehouse-58"), "", "HD 58: no race board");
  // The ballot view says the same two things.
  const page = G.pageHtml({ located: true, state: "Georgia", levels: [
    { key: "statesenate", district: "42", pid: null }, { key: "statehouse", district: "58", pid: "park_cannon_ga" }] });
  has(page, "District 42 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: an uncontested seat says so");
  lacks(page, "/district/ga-hd-58", "ballot view: an uncontested seat has no board");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootGA(at("Atlanta", "Fulton County", "5", "36", "58"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  for (const r of G.RACES) {
    ok(r.seat === `ga-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Georgia", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party letter`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key], `${c.key}: a name key is not a roster id`); ok(G.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); }
      if (!c.pid) continue;
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Georgia", `${c.pid}: a Georgia roster record`);
      ok(G.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, vote, votes] of G.ACTS) {
    ok(!!G.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    ok(/^(House|Senate) Vote #\d+$/.test(vote), `act ${m}: the vote number legis.ga.gov prints`);
    eq(vote.split(" ")[0], what.split(" ")[0], `act ${m}: the vote's chamber is the action's`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || (who === "@mughal" ? "Representative" : ""));
      if (/^House/.test(what)) ok(/Representative/.test(office), `act ${m}: ${who} voted in the House`);
      if (/^Senate/.test(what)) ok(/Senator/.test(office), `act ${m}: ${who} voted in the Senate`);
    }
  }
  const METHOD = /\b(?:precedent|mirror|primary|on-axis|coded|weighted|mapping|roll call|tally|voted|score)\b/i;
  for (const k in G.MEASURES) {
    const m = G.MEASURES[k];
    const e = m.effect;
    ok(e.length <= 140, `${k}: effect line is ${e.length} characters`);
    ok(/^[A-Z]/.test(e) && /\.$/.test(e) && e.slice(0, -1).indexOf(". ") < 0, `${k}: one sentence, ending on its stop`);
    ok(!METHOD.test(e), `${k}: no method words`);
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Act \d+ of 20\d\d$/.test(m.act), `${k}: a law reads as done and names its act`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.legis\.ga\.gov\/legislation\/\d+$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").length > 20, `${k}: the line names what it was written from`);
  }
  for (const who of inRace) {
    const d = G.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootGA(at("Lawrenceville", "Gwinnett County", "9", "48", "105"));
  const vw = {}; vw.window = vw; vm.runInContext(R("district-voice.js"), vm.createContext(vw), { filename: "district-voice.js" });
  W.PDXVoice = vw.PDXVoice;
  const page = W.PDXGaBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxga-seat="ga-statesenate-48"', "the Senate race is on the page");
  has(page, 'data-pdxga-seat="ga-statehouse-105"', "the House race is on the page");
  for (const c of [...G.race("statesenate", 48).field, ...G.race("statehouse", 105).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, G.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  // Mughal: acts under his name, no file.
  const mughal = page.split('data-pdxga-cand="@mughal"')[1] || "";
  has(mughal.split("</li>").slice(0, 3).join(""), G.MEASURES["HB 1105"].effect, "Farooq Mughal: his 2024 acts are listed");
  lacks(mughal.split('<li class="pdxpa-cand"')[0], "’s file", "Farooq Mughal: no file is linked");
  lacks(page, 'href="/p/@mughal"', "Farooq Mughal: no file address");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/ga-sd-48"', "the Senate seat's board is linked");
  has(page, 'href="/district/ga-hd-105"', "the House seat's board is linked");
  has(G.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/ga"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/ga", "/ballot/ga/", "/ballot/ga.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-ga.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-ga.html")), "ballot-ga.html is on disk");
  const doc = R("ballot-ga.html");
  has(doc, 'id="pdx-ga-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/ga-ballot-2026.js"', "the ballot document loads the data");
  lacks(doc, "Pennsylvania", "the Georgia ballot document says nothing about Pennsylvania");
  const idx = R("index.html");
  ok(idx.indexOf('src="/ga-ballot-2026.js"') >= 0 && idx.indexOf('src="/ga-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads ga-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const vw = {}; vw.window = vw; vm.runInContext(R("district-voice.js"), vm.createContext(vw), { filename: "district-voice.js" });
  const routes = vw.PDXVoice.BOARD_ROUTES;
  const gaLeg = Object.keys(routes).filter((k) => /^ga-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(gaLeg), JSON.stringify(G.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Georgia seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of G.RACES) {
    const alias = `ga-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxga-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/ga"', `${doc}: links the Georgia ballot view`);
    for (const c of r.field) has(h, c.name.replace(/’/g, "&rsquo;").replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, G.actsFor(inc.pid)[0].effect.replace(/’/g, "’"), `${doc}: prints an effect line`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-ga-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, G.RACES.length, "no Georgia legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!ga-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxga-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Georgia race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "ga-hd-", `${f}: no Georgia composer row`);
    lacks(R(f), "ga-sd-", `${f}: no Georgia composer row`);
  }
  // Pennsylvania's boards are byte-identical to HEAD's.
  for (const f of readdirSync(ROOT).filter((f) => /^district-pa-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", "pa-ballot-2026.js",
    "db/roster-state-legislators-oh-ga-nc-2026-oct.json"]) {
    eq(R(f), HEAD(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  eq(ver(R("sw.js")), ver(HEAD("sw.js")) + 1, "sw.js: CACHE_VERSION moved exactly one step");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's Pennsylvania file, against today's with both files.
  const now = bootGA({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  vm.runInContext(HEAD("pa-ballot-2026.js"), was, { filename: "pa-ballot-2026.js@HEAD" });
  // Pennsylvania's contested seats, so its act rows are compared too.
  const PA_SEATS = ["6", "16", "12", "18", "144", "160"];
  for (const st of STATES) {
    for (const d of st === "Pennsylvania" ? PA_SEATS : ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const B = ctx(HEAD("cmp-data.js"));
  for (const k of Object.keys(B)) if (String(B[k].state) === "Georgia") eq(JSON.stringify(RO[k]), JSON.stringify(B[k]), `${k}: shell moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["ga-ballot-2026.js", "ballot-ga.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-ga-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} ga contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
