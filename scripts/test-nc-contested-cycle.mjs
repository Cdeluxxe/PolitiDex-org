#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-nc-contested-cycle.mjs — North Carolina, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// nc-ballot-2026.js holds the contested State House and State Senate races on
// North Carolina's November 3, 2026 ballot that have a sitting member running,
// and the formal acts on file for the people in them, each a recorded floor
// vote read from the General Assembly's roll-call transcript (ncleg.gov) and
// linked to it.
//
// What it pins:
//
//   1. A NORTH CAROLINA LOCATION IN A CONTESTED SEAT names the right sitting
//      member on Who Represents Me, with at least one formal act and its effect
//      line under the row, and the door to /ballot/nc.
//   2. A VACANT OR UNCONTESTED SEAT: House 113 (no member on the roster) reads
//      "District 113 — no member on file yet"; Senate 1 (held, no act on file,
//      not opened) shows its sitting member with no act block and no board.
//   3. THE DATA: every act names a measure on file, an ncleg.gov roll-call
//      transcript and a person in one of the races; every incumbent is the
//      member the resolver seats; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board;
//      challengers with a record and no roster row (James Gailliard, John
//      Rhodes) get acts and no file; one with no record gets "No formal act on
//      file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested seats,
//      each printing its race; no other North Carolina legislative seat has one,
//      and the Pennsylvania and Georgia boards are byte-identical to HEAD.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, Pennsylvania's and Georgia's
//      contested seats included; the roster, resolver, existing shells and the
//      Pennsylvania and Georgia data are byte-identical; the worker moved one
//      version and precaches nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-nc-contested-cycle.mjs

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
const must = (c, m) => { if (!c) { console.error(`✗ nc contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const BALLOTS = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js"];

const at = (city, county, cd, sd, hd) => ({ state: "North Carolina", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all three ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootNC = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("nc-ballot-2026.js"), vm.createContext(w)); return w.PDXNcBallot; })();
must(N && N.RACES && N.RACES.length >= 6, "nc-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a North Carolina location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A Mecklenburg County location placed in State Senate 42 and State House
  // 105, both contested.
  const W = bootNC(at("Charlotte", "Mecklenburg County", "9", "42", "105"));
  eq(levelOf(W, "statesenate").pid, "bradley_nc", "SD 42: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "cotham_nc", "HD 105: the sitting representative");
  const out = band(W);
  has(out, "Woodson Bradley", "SD 42: the senator is on the card");
  has(out, "Tricia Ann Cotham", "HD 105: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["bradley_nc", "cotham_nc"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxnc-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://www.ncleg.gov/Legislation/Votes/RollCallVoteTranscript/", `${pid}: the act links to its roll call`);
    has(b, 'href="/ballot/nc"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 42 — no member on file yet", "SD 42 is named");
  lacks(out, "District 105 — no member on file yet", "HD 105 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Manteo", "Dare County", "3", "1", "113");
  const W = bootNC(loc);
  eq(levelOf(W, "statesenate").pid, "tillett_nc", "SD 1: the sitting member");
  eq(levelOf(W, "statehouse").pid, null, "HD 113: no member is named");
  const out = band(W);
  has(out, "District 113 — no member on file yet", "HD 113: the row says nobody is on file");
  has(out, "Jerry Tillett", "SD 1: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "SD 1 / HD 113: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("nc-statesenate-1"), "", "SD 1: no board");
  eq(V.boardPath("nc-statehouse-113"), "", "HD 113: no board");
  ok(!N.race("statesenate", 1), "SD 1 is not one of the races on file");
  const page = N.pageHtml({ located: true, state: "North Carolina", levels: [
    { key: "statesenate", district: "1", pid: "tillett_nc" }, { key: "statehouse", district: "113", pid: null }] });
  has(page, "District 113 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "/district/nc-sd-1", "ballot view: no board for SD 1");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootNC(at("Raleigh", "Wake County", "2", "16", "34"));
const RO = W0.CMP_DATA;
const KEY_OFFICE = { "@gailliard": "Representative", "@rhodes": "Representative" };
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `nc-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("North Carolina", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^[RDGLI]$/.test(c.party), `${r.seat} ${c.name}: party letter`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key] && !!KEY_OFFICE[c.key], `${c.key}: a name key is not a roster id`); ok(N.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); }
      if (!c.pid) continue;
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "North Carolina", `${c.pid}: a North Carolina roster record`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, path, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^(19|20)\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    const pm = /^(\d{4})\/([HS])\/(\d+)$/.exec(path);
    if (!ok(pm, `act ${m}: a roll-call transcript path`)) continue;
    eq(pm[2] === "H" ? "House" : "Senate", what.split(" ")[0], `act ${m}: the transcript's chamber is the action's`);
    ok(+pm[1] % 2 === 1 && +date.slice(0, 4) - +pm[1] <= 1 && +date.slice(0, 4) >= +pm[1], `act ${m}: the date falls in the ${pm[1]} session`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
      ok(inRace.has(who), `act ${m}: ${who} is in a race`);
      const office = String((RO[who] || {}).office || KEY_OFFICE[who] || "");
      if (/^House/.test(what) && pm[1] === "2025") ok(/Representative/.test(office), `act ${m}: ${who} voted in the House`);
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
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^S\.L\. 20\d\d-\d+$/.test(m.act), `${k}: a law reads as done and names its session law`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.ncleg\.gov\/BillLookUp\/\d{4}\/[HS]\d+$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").length > 20, `${k}: the line names what it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) ok(/^https:\/\/www\.ncleg\.gov\/Legislation\/Votes\/RollCallVoteTranscript\/\d{4}\/[HS]\/\d+$/.test(a.source), `${who} ${a.measure}: links its roll call`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootNC(at("Rocky Mount", "Nash County", "1", "11", "25"));
  W.PDXVoice = voice();
  const page = W.PDXNcBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxnc-seat="nc-statesenate-11"', "the Senate race is on the page");
  has(page, 'data-pdxnc-seat="nc-statehouse-25"', "the House race is on the page");
  for (const c of [...N.race("statesenate", 11).field, ...N.race("statehouse", 25).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, N.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  const gailliard = page.split('data-pdxnc-cand="@gailliard"')[1] || "";
  const gOwn = gailliard.split('<li class="pdxpa-cand"')[0];
  has(gOwn, N.MEASURES["SB 101"].effect, "James Gailliard: his 2021–22 acts are listed");
  lacks(gOwn, "’s file", "James Gailliard: no file is linked");
  lacks(page, 'href="/p/@', "no keyed challenger has a file address");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/nc-sd-11"', "the Senate seat's board is linked");
  has(page, 'href="/district/nc-hd-25"', "the House seat's board is linked");
  // John Rhodes, House 98.
  const R98 = N.pageHtml({ located: true, state: "North Carolina", levels: [{ key: "statehouse", district: "98", pid: "helfrich_nc" }] });
  const rOwn = (R98.split('data-pdxnc-cand="@rhodes"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(rOwn, N.MEASURES["HB 1023"].effect, "John Rhodes: his 2005 act is listed");
  lacks(rOwn, "’s file", "John Rhodes: no file is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/nc"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/nc", "/ballot/nc/", "/ballot/nc.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-nc.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-nc.html")), "ballot-nc.html is on disk");
  const doc = R("ballot-nc.html");
  has(doc, 'id="pdx-nc-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/nc-ballot-2026.js"', "the ballot document loads the data");
  lacks(doc, "Pennsylvania", "the North Carolina ballot document says nothing about Pennsylvania");
  lacks(doc, "Georgia", "the North Carolina ballot document says nothing about Georgia");
  const idx = R("index.html");
  ok(idx.indexOf('src="/nc-ballot-2026.js"') >= 0 && idx.indexOf('src="/nc-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads nc-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const ncLeg = Object.keys(routes).filter((k) => /^nc-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(ncLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested North Carolina seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `nc-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxnc-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/nc"', `${doc}: links the North Carolina ballot view`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-nc-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no North Carolina legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!nc-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxnc-seat=") >= 0) ok(false, `${f}: a board outside the races carries a North Carolina race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "nc-hd-", `${f}: no North Carolina composer row`);
    lacks(R(f), "nc-sd-", `${f}: no North Carolina composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga)-(?:hd|sd)-\d+\.html$/.test(f))) eq(R(f), HEAD(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", "pa-ballot-2026.js", "ga-ballot-2026.js",
    "ballot-pa.html", "ballot-ga.html", "db/roster-state-legislators-oh-ga-nc-2026-oct.json"]) {
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
    "New Jersey", "New Mexico", "New York", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's Pennsylvania and Georgia files, against today's
  // with all three.
  const now = bootNC({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of ["pa-ballot-2026.js", "ga-ballot-2026.js"]) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in Pennsylvania and Georgia, so their act rows are
  // compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"] };
  for (const st of STATES) {
    for (const d of SEATS[st] || ["1", "2", "7", "16", "40"]) {
      const loc = { state: st, city: "", county: "", district: "1", stateSenateDistrict: d, stateHouseDistrict: d, mapSelected: true };
      now._currentVoterLocation = Object.assign({}, loc);
      was._currentVoterLocation = Object.assign({}, loc);
      eq(band(now), band(was), `${st} seat ${d}: the card changed`);
    }
  }
  const ctx = (src) => { const w = {}; w.window = w; vm.createContext(w); vm.runInContext(src, w); return w.CMP_DATA; };
  const B = ctx(HEAD("cmp-data.js"));
  for (const k of Object.keys(B)) if (String(B[k].state) === "North Carolina") eq(JSON.stringify(RO[k]), JSON.stringify(B[k]), `${k}: shell moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["nc-ballot-2026.js", "ballot-nc.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-nc-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} nc contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
