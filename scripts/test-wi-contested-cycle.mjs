#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wi-contested-cycle.mjs — Wisconsin, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// wi-ballot-2026.js holds the contested State Assembly and State Senate races
// on Wisconsin's November 3, 2026 ballot that have a sitting member running,
// and the formal acts on file for the people in them, each a recorded floor
// vote read from the roll call page on docs.legis.wisconsin.gov and linked to
// it. cmp-data.js gains one identity row per incumbent in those races, and one
// for the challenger who sits in the Assembly today.
//
// What it pins:
//
//   1. A WISCONSIN LOCATION IN A CONTESTED SEAT names the right sitting member
//      on Who Represents Me, with at least one formal act and its effect line
//      under the row, and the door to /ballot/wi.
//   2. A VACANT OR UNCONTESTED SEAT: Assembly 76 (no member on the roster)
//      reads "District 76 — no member on file yet"; Senate 27 (held, on the
//      ballot, not contested) shows its sitting member with no act block and
//      no board; Senate 12 (held, even-numbered) is elected in 2028.
//   3. THE DATA: every act names a measure on file, a roll call page on the
//      Legislature's site and a person in one of the races; every incumbent is
//      the member the resolver seats; every Senate race is an odd-numbered
//      seat; every effect line keeps CONTENT_STYLE.md. The new roster rows are
//      identity rows, all Wisconsin, and every earlier row is unchanged.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board; a
//      challenger with a record (Jenna Jacobson) gets acts and a file; one
//      with no record gets "No formal act on file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested
//      seats, each printing its race; no other Wisconsin legislative seat has
//      one, and the five earlier states' boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the five earlier contested
//      cycles included, and every Wisconsin seat outside the new rows; the
//      resolver and the earlier states' data are byte-identical; the worker
//      moved one version and precaches nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-wi-contested-cycle.mjs

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
const must = (c, m) => { if (!c) { console.error(`✗ wi contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const EARLIER = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js", "oh-ballot-2026.js"];
const BALLOTS = [...EARLIER, "wi-ballot-2026.js"];
const NEW_PIDS = ["marklein_wi", "smith_wi", "sheehan_wi", "zimmerman_wi", "jacobson_wi", "novak_wi", "donovan_wi",
  "snyder_wi", "franklin_wi", "spaude_wi", "emerson_wi", "moses_wi", "doyle_wi"];

const at = (city, county, cd, sd, hd) => ({ state: "Wisconsin", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all six ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootWI = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("wi-ballot-2026.js"), vm.createContext(w)); return w.PDXWiBallot; })();
must(N && N.RACES && N.RACES.length >= 4, "wi-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Wisconsin location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Dodgeville: Senate 17 and Assembly 51, both contested.
  const W = bootWI(at("Dodgeville", "Iowa County", "3", "17", "51"));
  eq(levelOf(W, "statesenate").pid, "marklein_wi", "SD 17: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "novak_wi", "AD 51: the sitting representative");
  const out = band(W);
  has(out, "Howard Marklein", "SD 17: the senator is on the card");
  has(out, "Todd Novak", "AD 51: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["marklein_wi", "novak_wi"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxwi-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://docs.legis.wisconsin.gov/", `${pid}: the act links to the Legislature`);
    has(b, "/related/votes/", `${pid}: the act links to its roll call`);
    has(b, 'href="/ballot/wi"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 17 — no member on file yet", "SD 17 is named");
  lacks(out, "District 51 — no member on file yet", "AD 51 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Madison", "Dane County", "2", "27", "76");
  const W = bootWI(loc);
  eq(levelOf(W, "statesenate").pid, "dianne_hesselbein", "SD 27: the sitting member");
  eq(levelOf(W, "statehouse").pid, null, "AD 76: no member is named");
  const out = band(W);
  has(out, "District 76 — no member on file yet", "AD 76: the row says nobody is on file");
  has(out, "Dianne Hesselbein", "SD 27: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") }));
  eq(out, was, "SD 27 / AD 76: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("wi-statesenate-27"), "", "SD 27: no board");
  eq(V.boardPath("wi-statehouse-76"), "", "AD 76: no board");
  eq(V.boardPath("wi-statesenate-12"), "", "SD 12: no board");
  eq(V.boardPath("wi-statehouse-50"), "", "AD 50 (an open seat whose member runs for the Senate): no board");
  ok(!N.race("statesenate", 27), "SD 27 is not one of the races on file");
  const page = W.PDXWiBallot.pageHtml({ located: true, state: "Wisconsin", levels: [
    { key: "statesenate", district: "12", pid: "mary_felzkowski" }, { key: "statehouse", district: "76", pid: null }] });
  has(page, "District 76 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Mary Felzkowski", "ballot view: an uncontested seat shows its sitting member");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: an Assembly seat with no race says so");
  has(page, "Wisconsin elects this Senate seat in 2028.", "ballot view: an even-numbered Senate seat is not on the 2026 ballot");
  lacks(page, "/district/wi-sd-12", "ballot view: no board for SD 12");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats, effect lines and roster rows");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootWI(at("Madison", "Dane County", "2", "27", "76"));
const RO = W0.CMP_DATA;
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `wi-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    if (r.chamber === "statesenate") ok(r.district % 2 === 1, `${r.seat}: Wisconsin elects even-numbered Senate seats in 2028, not 2026`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Wisconsin", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:[RDGLI]|American Solidarity)$/.test(c.party), `${r.seat} ${c.name}: party`);
      ok(!c.key, `${r.seat} ${c.name}: no name keys in this file`);
      if (!c.pid) { eq(N.actsFor(c.name).length, 0, `${c.name}: a challenger with no record has no acts`); continue; }
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Wisconsin", `${c.pid}: a Wisconsin roster record`);
      eq(RO[c.pid] && RO[c.pid].name, c.name, `${c.pid}: the roster name is the race's`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, path, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^(19|20)\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    if (!ok(/^20\d\d\/related\/votes\/(?:assembly\/av|senate\/sv)\d{4}$/.test(path), `act ${m}: a roll call page`)) continue;
    eq(path.slice(0, 4), N.MEASURES[m].source.slice("https://docs.legis.wisconsin.gov/".length, "https://docs.legis.wisconsin.gov/".length + 4),
      `act ${m}: the roll call is in the measure's own session`);
    ok(/^(Assembly|Senate) /.test(what), `act ${m}: the action names its chamber`);
    eq(/^Assembly/.test(what), path.indexOf("/assembly/") > 0, `act ${m}: the action's chamber is the roll call's`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (not voting and paired are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || "");
      if (/^Assembly/.test(what)) ok(/Representative/.test(office), `act ${m}: ${who} voted in the Assembly`);
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
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Signed (?:with partial vetoes )?[A-Z][a-z]+ \d{1,2}, 20\d\d \(20\d\d Wisconsin Act \d+\)$/.test(m.act), `${k}: a law reads as done and names its act number`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/docs\.legis\.wisconsin\.gov\/20\d\d\/proposals\/[a-z0-9]+\/(?:asm|sen)\/bill\/[as]b\d+$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").indexOf("Relating to:") === 0, `${k}: the line names the relating clause it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(/^https:\/\/docs\.legis\.wisconsin\.gov\/20\d\d\/related\/votes\//.test(a.source), `${who} ${a.measure}: links its roll call`);
  }
  // The roster: thirteen identity rows, every one of them in a race, none
  // added or dropped since, and every row HEAD held unchanged.
  const B = (() => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(HEAD("cmp-data.js"), w); return w.CMP_DATA; })();
  for (const k of NEW_PIDS) ok(!!RO[k], `cmp-data.js: the Wisconsin row ${k} is on file`);
  eq(JSON.stringify([...inRace].sort()), JSON.stringify([...NEW_PIDS].sort()), "every Wisconsin contested-race row is a name in a race");
  for (const k of Object.keys(B)) if (JSON.stringify(RO[k]) !== JSON.stringify(B[k])) ok(false, `${k}: an existing roster row moved`);
  for (const k of NEW_PIDS) {
    const r = RO[k];
    ok(r.candidate === false && r.score === null && r.party === undefined && r.issues.length === 0, `${k}: an identity row only`);
    ok(/^Wisconsin State (?:Senator|Representative)$/.test(r.office), `${k}: office`);
    ok(/^(?:SD|HD) \d+$/.test(r.district), `${k}: district`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootWI(at("Dodgeville", "Iowa County", "3", "17", "51"));
  W.PDXVoice = voice();
  const page = W.PDXWiBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxwi-seat="wi-statesenate-17"', "the Senate race is on the page");
  has(page, 'data-pdxwi-seat="wi-statehouse-51"', "the Assembly race is on the page");
  for (const c of [...N.race("statesenate", 17).field, ...N.race("statehouse", 51).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, N.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  const jOwn = (page.split('data-pdxwi-cand="jacobson_wi"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(jOwn, "Challenger", "Jenna Jacobson: a challenger");
  has(jOwn, "Jenna Jacobson’s file", "Jenna Jacobson: her file is linked");
  has(jOwn, N.MEASURES["SB 45"].effect, "Jenna Jacobson: her Assembly acts are listed");
  has(page, "(American Solidarity)", "a third-party name keeps its party");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  const gOwn = (page.split('data-pdxwi-cand="Ben Gruber"')[1] || "").split('<li class="pdxpa-cand"')[0];
  lacks(gOwn, 'href="/p/', "Ben Gruber: no file");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/wi-sd-17"', "the Senate seat's board is linked");
  has(page, 'href="/district/wi-hd-51"', "the Assembly seat's board is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/wi"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/wi", "/ballot/wi/", "/ballot/wi.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-wi.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-wi.html")), "ballot-wi.html is on disk");
  const doc = R("ballot-wi.html");
  has(doc, 'id="pdx-wi-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/wi-ballot-2026.js"', "the ballot document loads the data");
  for (const st of ["Pennsylvania", "Georgia", "North Carolina", "Michigan", "Ohio"]) lacks(doc, st, `the Wisconsin ballot document says nothing about ${st}`);
  const idx = R("index.html");
  ok(idx.indexOf('src="/wi-ballot-2026.js"') >= 0 && idx.indexOf('src="/wi-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads wi-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const wiLeg = Object.keys(routes).filter((k) => /^wi-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(wiLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Wisconsin seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `wi-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxwi-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/wi"', `${doc}: links the Wisconsin ballot view`);
    has(h, `<h1 class="pdxdb-h1">Wisconsin ${r.chamber === "statesenate" ? "Senate" : "Assembly"} District ${r.district}</h1>`, `${doc}: names its chamber`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-wi-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Wisconsin legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!wi-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxwi-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Wisconsin race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "wi-hd-", `${f}: no Wisconsin composer row`);
    lacks(R(f), "wi-sd-", `${f}: no Wisconsin composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc|mi|oh)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  for (const f of readdirSync(ROOT).filter((f) => /^district-wi-(?:cd-\d+|us-senate-.*)\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["voter-hub-location.js", "seated-member.js", ...EARLIER, "ballot-pa.html", "ballot-ga.html", "ballot-nc.html",
    "ballot-mi.html", "ballot-oh.html", "db/roster-state-legislators-tn-in-mo-2026-oct.json"]) {
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
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 50, "fixture: 50 states");
  // HEAD's card, HEAD's roster and HEAD's five ballot files, against today's
  // with all six.
  const now = bootWI({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js"), "cmp-data.js": HEAD("cmp-data.js") });
  for (const f of EARLIER) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in the five earlier states, so their act rows are
  // compared too; in Wisconsin, every seat this pass left alone.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"],
    Michigan: ["9", "35", "27", "28", "44", "46", "55", "61", "86", "109"],
    Ohio: ["29", "10", "17", "36", "60", "12", "89"],
    Wisconsin: ["1", "2", "7", "9", "12", "27", "40", "76"] };
  for (const st of STATES) {
    for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["wi-ballot-2026.js", "ballot-wi.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["cmp-data.js", "who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-wi-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} wi contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
