#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-mi-contested-cycle.mjs — Michigan, one contested cycle (Nov. 3, 2026)
// ─────────────────────────────────────────────────────────────────────────────
// mi-ballot-2026.js holds the contested State House and State Senate races on
// Michigan's November 3, 2026 ballot that have a sitting member running, and
// the formal acts on file for the people in them, each a recorded floor vote
// read from the House or Senate Journal on legislature.mi.gov and linked to
// that journal page.
//
// What it pins:
//
//   1. A MICHIGAN LOCATION IN A CONTESTED SEAT names the right sitting member
//      on Who Represents Me, with at least one formal act and its effect line
//      under the row, and the door to /ballot/mi.
//   2. A VACANT OR UNCONTESTED SEAT: House 63 (no member on the roster) reads
//      "District 63 — no member on file yet"; Senate 12 (held, not one of the
//      races) shows its sitting member with no act block and no board.
//   3. THE DATA: every act names a measure on file, a House or Senate Journal
//      page and a person in one of the races; every incumbent is the member the
//      resolver seats; every effect line keeps CONTENT_STYLE.md.
//   4. THE BALLOT VIEW walks location → races → names, files, acts → board;
//      challengers with a record and no roster row (Jaime Churches, Jim
//      Haadsma) get acts and no file; one with no record gets "No formal act on
//      file" and no file.
//   5. DISTRICT VOICE: a read-only board opens for exactly the contested seats,
//      each printing its race; no other Michigan legislative seat has one, and
//      the Pennsylvania, Georgia and North Carolina boards are byte-identical.
//   6. EVERY OTHER STATE'S CARD MATCHES HEAD, the Pennsylvania, Georgia and
//      North Carolina contested seats included; the roster, resolver, existing
//      shells and the three earlier states' data are byte-identical; the worker
//      moved one version and precaches nothing new; no migration was added.
//   7. NO EQUITY LANGUAGE in anything this pass added.
//
//   node scripts/test-mi-contested-cycle.mjs

import { R, HEAD, boot, levelOf, band, settled } from "./state-leg-harness.mjs";
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
const must = (c, m) => { if (!c) { console.error(`✗ mi contested cycle: STALE HARNESS — ${m}`); process.exit(2); } };
const EQUITY = /\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i;
const BALLOTS = ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js", "mi-ballot-2026.js"];

const at = (city, county, cd, sd, hd) => ({ state: "Michigan", city, county, district: cd,
  stateSenateDistrict: sd, stateHouseDistrict: hd, mapSelected: true });
// The real card, with all four ballot files loaded ahead of
// who-represents-me.js as index.html loads them.
const bootMI = (loc, over) => {
  const W = boot(loc, over);
  for (const f of BALLOTS) vm.runInContext(R(f), W, { filename: f });
  return W;
};
const N = (() => { const w = {}; w.window = w; vm.runInContext(R("mi-ballot-2026.js"), vm.createContext(w)); return w.PDXMiBallot; })();
must(N && N.RACES && N.RACES.length >= 6, "mi-ballot-2026.js published no races");
const actBlocks = (out) => out.split('<div class="pdxpa-seat"').slice(1);
const voice = () => { const w = {}; w.window = w; vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" }); return w.PDXVoice; };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a Michigan location in a contested seat names the member and an act");
// ═════════════════════════════════════════════════════════════════════════════
{
  // An Oakland County location placed in State Senate 9 and State House 55,
  // both contested.
  const W = bootMI(at("Rochester Hills", "Oakland County", "11", "9", "55"));
  eq(levelOf(W, "statesenate").pid, "webber_mi", "SD 9: the sitting senator");
  eq(levelOf(W, "statehouse").pid, "tisdel_mi", "HD 55: the sitting representative");
  const out = band(W);
  has(out, "Michael Webber", "SD 9: the senator is on the card");
  has(out, "Mark A Tisdel", "HD 55: the representative is on the card");
  const blocks = actBlocks(out);
  eq(blocks.length, 2, "both contested seats carry a formal-record block");
  for (const pid of ["webber_mi", "tisdel_mi"]) {
    const b = blocks.find((x) => x.indexOf(`data-pdxmi-pid="${pid}"`) >= 0) || "";
    const first = N.actsFor(pid)[0];
    ok(!!first, `${pid}: no act on file`);
    has(b, first.effect, `${pid}: the newest act's effect line is under the row`);
    has(b, "https://www.legislature.mi.gov/documents/", `${pid}: the act links to its journal page`);
    has(b, first.vote, `${pid}: the act names its roll call`);
    has(b, 'href="/ballot/mi"', `${pid}: the row opens the ballot view`);
  }
  lacks(out, "District 9 — no member on file yet", "SD 9 is named");
  lacks(out, "District 55 — no member on file yet", "HD 55 is named");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a vacant or uncontested seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const loc = at("Lansing", "Ingham County", "7", "12", "63");
  const W = bootMI(loc);
  eq(levelOf(W, "statesenate").pid, "hertel_mi", "SD 12: the sitting member");
  eq(levelOf(W, "statehouse").pid, null, "HD 63: no member is named");
  const out = band(W);
  has(out, "District 63 — no member on file yet", "HD 63: the row says nobody is on file");
  has(out, "Kevin Hertel", "SD 12: the sitting member is on the card");
  eq(actBlocks(out).length, 0, "a seat with no act on file carries no act block");
  const was = band(boot(loc, { "who-represents-me.js": HEAD("who-represents-me.js") }));
  eq(out, was, "SD 12 / HD 63: the card is HEAD's");
  const V = voice();
  eq(V.boardPath("mi-statesenate-12"), "", "SD 12: no board");
  eq(V.boardPath("mi-statehouse-63"), "", "HD 63: no board");
  ok(!N.race("statesenate", 12), "SD 12 is not one of the races on file");
  const page = N.pageHtml({ located: true, state: "Michigan", levels: [
    { key: "statesenate", district: "12", pid: "hertel_mi" }, { key: "statehouse", district: "63", pid: null }] });
  has(page, "District 63 — no member on file yet", "ballot view: an empty seat says nobody is on file");
  has(page, "Not one of the contested races on file for this ballot.", "ballot view: a seat with no race says so");
  lacks(page, "/district/mi-sd-12", "ballot view: no board for SD 12");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the data: acts, sources, seats and effect lines");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = bootMI(at("Lansing", "Ingham County", "7", "12", "63"));
const RO = W0.CMP_DATA;
const KEY_OFFICE = { "@churches": "Representative", "@haadsma": "Representative" };
{
  const inRace = new Set();
  for (const r of N.RACES) {
    ok(r.seat === `mi-${r.chamber}-${r.district}`, `${r.seat}: seat key`);
    ok(/^https:\/\//.test(r.source), `${r.seat}: who-is-running source`);
    const inc = r.field.filter((c) => c.incumbent);
    eq(inc.length, 1, `${r.seat}: exactly one incumbent`);
    eq(inc[0] && inc[0].pid, W0._pdxStateLegSeat("Michigan", r.chamber, r.district), `${r.seat}: the incumbent is the member the resolver seats`);
    ok(r.field.length >= 2, `${r.seat}: a race has more than one name`);
    for (const c of r.field) {
      ok(/^(?:[RDGLI]|Working Class|U\.S\. Taxpayers|No Party Affiliation)$/.test(c.party), `${r.seat} ${c.name}: party`);
      ok(!(c.pid && c.key), `${r.seat} ${c.name}: a pid or a name key, not both`);
      if (c.key) { ok(!RO[c.key] && !!KEY_OFFICE[c.key], `${c.key}: a name key is not a roster id`); ok(N.actsFor(c.key).length >= 1, `${c.name}: a keyed challenger has acts`); inRace.add(c.key); }
      if (!c.pid) continue;
      inRace.add(c.pid);
      ok(RO[c.pid] && RO[c.pid].state === "Michigan", `${c.pid}: a Michigan roster record`);
      ok(N.actsFor(c.pid).length >= 1, `${c.pid}: at least one formal act on file`);
      if (c.incumbent) ok(W0.pdxSeatClaim(c.pid, r.chamber, r.district) !== "mismatch", `${c.pid}: the record contradicts ${r.seat}`);
    }
  }
  for (const [m, what, date, journal, rc, votes] of N.ACTS) {
    ok(!!N.MEASURES[m], `act ${m}: measure on file`);
    ok(/^20\d\d-\d\d-\d\d$/.test(date), `act ${m}: date`);
    const jm = /^(\d{4})-([HS])J-(\d\d)-(\d\d)-\d{3}$/.exec(journal);
    if (!ok(jm, `act ${m}: a journal object name`)) continue;
    eq(jm[2] === "H" ? "House" : "Senate", what.split(" ")[0], `act ${m}: the journal's chamber is the action's`);
    eq(`${jm[1]}-${jm[3]}-${jm[4]}`, date, `act ${m}: the date is the journal's`);
    ok(Number.isInteger(rc) && rc > 0, `act ${m}: a roll-call number`);
    for (const who in votes) {
      ok(votes[who] === "Yea" || votes[who] === "Nay", `act ${m} ${who}: ${votes[who]} (excused and not voting are not acts)`);
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
    ok(!/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/.test(e), `${k}: names no tally`);
    ok(!/\b(?:Republican|Democrat|GOP|party)\b/i.test(e), `${k}: no partisan framing`);
    if (m.status === "failed") ok(/^Would have /.test(e), `${k}: a failed act opens "Would have"`);
    else if (m.status === "passed") ok(/^Would (?!have)/.test(e), `${k}: an act that passed one chamber opens "Would"`);
    else if (m.status === "law") ok(!/^Would/.test(e) && /^Public Act \d+ of 20\d\d$/.test(m.act), `${k}: a law reads as done and names its public act`);
    else ok(false, `${k}: unknown status ${m.status}`);
    ok(/^https:\/\/www\.legislature\.mi\.gov\/Bills\/Bill\?ObjectName=20\d\d-[HS]B-\d{4}$/.test(m.source), `${k}: the bill page`);
    ok(String(m.from || "").length > 20, `${k}: the line names what it was written from`);
  }
  for (const who of inRace) {
    const d = N.actsFor(who).map((a) => a.date);
    eq(JSON.stringify(d), JSON.stringify([...d].sort().reverse()), `${who}: acts newest first`);
    for (const a of N.actsFor(who)) {
      ok(/^https:\/\/www\.legislature\.mi\.gov\/documents\/\d{4}-\d{4}\/journal\/(?:House|Senate)\/htm\/20\d\d-[HS]J-[0-9-]+\.htm$/.test(a.source), `${who} ${a.measure}: links its journal page`);
      ok(/^Roll Call No\. \d+$/.test(a.vote), `${who} ${a.measure}: names its roll call`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the ballot view: location → races → names, files, acts → board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const W = bootMI(at("Battle Creek", "Calhoun County", "5", "35", "44"));
  W.PDXVoice = voice();
  const page = W.PDXMiBallot.pageHtml(W.pdxRepsForMe());
  has(page, 'data-pdxmi-seat="mi-statesenate-35"', "the Senate race is on the page");
  has(page, 'data-pdxmi-seat="mi-statehouse-44"', "the House race is on the page");
  for (const c of [...N.race("statesenate", 35).field, ...N.race("statehouse", 44).field]) {
    has(page, c.name, `${c.name} is named`);
    if (c.pid) {
      has(page, `href="/p/${c.pid}"`, `${c.name}: the file is linked`);
      has(page, N.actsFor(c.pid)[0].effect, `${c.name}: an effect line`);
    }
  }
  const hOwn = (page.split('data-pdxmi-cand="@haadsma"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(hOwn, N.MEASURES["SB 271"].effect, "Jim Haadsma: his 2023 acts are listed");
  lacks(hOwn, "’s file", "Jim Haadsma: no file is linked");
  lacks(page, 'href="/p/@', "no keyed challenger has a file address");
  has(page, "No formal act on file. PolitiDex holds no legislative record for this candidate.", "a challenger with no record says so");
  lacks(page, 'href="/p/undefined"', "no challenger is given a file");
  has(page, 'href="/district/mi-sd-35"', "the Senate seat's board is linked");
  has(page, 'href="/district/mi-hd-44"', "the House seat's board is linked");
  // Jaime Churches, House 27.
  const P27 = N.pageHtml({ located: true, state: "Michigan", levels: [{ key: "statehouse", district: "27", pid: "linting_mi" }] });
  const cOwn = (P27.split('data-pdxmi-cand="@churches"')[1] || "").split('<li class="pdxpa-cand"')[0];
  has(cOwn, N.MEASURES["HB 4004"].effect, "Jaime Churches: her 2023 acts are listed");
  lacks(cOwn, "’s file", "Jaime Churches: no file is linked");
  has(N.pageHtml(null), 'href="/find"', "a reader with no location is sent to the finder");
  has(R("find.html"), 'href="/ballot/mi"', "/find links to the ballot view");
  const TOML = R("netlify.toml");
  for (const f of ["/ballot/mi", "/ballot/mi/", "/ballot/mi.html"]) has(TOML, `from = "${f}"\n  to = "/ballot-mi.html"\n  status = 200`, `netlify.toml: ${f}`);
  ok(existsSync(join(ROOT, "ballot-mi.html")), "ballot-mi.html is on disk");
  const doc = R("ballot-mi.html");
  has(doc, 'id="pdx-mi-ballot"', "the ballot document carries its mount");
  has(doc, 'src="/mi-ballot-2026.js"', "the ballot document loads the data");
  lacks(doc, "Pennsylvania", "the Michigan ballot document says nothing about Pennsylvania");
  lacks(doc, "Georgia", "the Michigan ballot document says nothing about Georgia");
  lacks(doc, "North Carolina", "the Michigan ballot document says nothing about North Carolina");
  const idx = R("index.html");
  ok(idx.indexOf('src="/mi-ballot-2026.js"') >= 0 && idx.indexOf('src="/mi-ballot-2026.js"') < idx.indexOf('src="/who-represents-me.js"'),
    "index.html loads mi-ballot-2026.js before who-represents-me.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · District Voice: a board for each contested seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const routes = voice().BOARD_ROUTES;
  const miLeg = Object.keys(routes).filter((k) => /^mi-(?:statehouse|statesenate)-\d+$/.test(k)).sort();
  eq(JSON.stringify(miLeg), JSON.stringify(N.RACES.map((r) => r.seat).sort()), "BOARD_ROUTES: exactly the contested Michigan seats");
  const otherLeg = Object.keys(routes).filter((k) => /^[a-z]{2}-(?:statehouse|statesenate)-\d+$/.test(k) && !/^(?:ut|pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co)-/.test(k));
  eq(otherLeg.length, 0, "no other state gained a state legislative board");
  const B = (() => { const w = makeSandbox(); vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard; })();
  for (const r of N.RACES) {
    const alias = `mi-${r.chamber === "statesenate" ? "sd" : "hd"}-${r.district}`;
    eq(routes[r.seat], `/district/${alias}`, `${r.seat}: the board's address`);
    eq((B.board(alias) || {}).composer, false, `${alias}: read-only`);
    const doc = `district-${alias}.html`;
    if (!ok(existsSync(join(ROOT, doc)), `${doc}: on disk`)) continue;
    const h = R(doc);
    has(h, `data-pdxmi-seat="${r.seat}"`, `${doc}: prints its race`);
    has(h, 'href="/ballot/mi"', `${doc}: links the Michigan ballot view`);
    for (const c of r.field) has(h, c.name.replace(/'/g, "&#39;"), `${doc}: names ${c.name}`);
    const inc = r.field.find((c) => c.incumbent);
    has(h, N.actsFor(inc.pid)[0].effect, `${doc}: prints an effect line`);
    if (r.issue) has(h, "Local issue:", `${doc}: names its local issue`);
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-mi-(?:hd|sd)-\d+\.html$/.test(f));
  eq(docs.length, N.RACES.length, "no Michigan legislative board document without a race");
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?!mi-(?:hd|sd)-).*\.html$/.test(f))) {
    if (R(f).indexOf("data-pdxmi-seat=") >= 0) ok(false, `${f}: a board outside the races carries a Michigan race block`);
  }
  for (const f of ["district-composer.js", "district-poll.js", "netlify/lib/district-board-voice-core.mjs"]) {
    lacks(R(f), "mi-hd-", `${f}: no Michigan composer row`);
    lacks(R(f), "mi-sd-", `${f}: no Michigan composer row`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-(?:pa|ga|nc)-(?:hd|sd)-\d+\.html$/.test(f))) ok(settled(f), `${f}: moved`);
  const chk = (() => { try { execFileSync("node", ["scripts/gen-district-boards.mjs", "--check"], { cwd: ROOT, stdio: "pipe" }); return true; } catch (e) { return false; } })();
  ok(chk, "gen-district-boards.mjs --check: every generated file is what the generator writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · every other state is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js", "pa-ballot-2026.js", "ga-ballot-2026.js",
    "nc-ballot-2026.js", "ballot-pa.html", "ballot-ga.html", "ballot-nc.html", "db/roster-state-legislators-mi-nj-va-2026-oct.json"]) {
    ok(settled(f), `${f}: byte-identical to HEAD`);
  }
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src || "") || [])[1]);
  ok(ver(R("sw.js")) === ver(HEAD("sw.js")) + 1 || R("sw.js") === HEAD("sw.js"), "sw.js: CACHE_VERSION moved exactly one step, or the worker was not touched");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(R("sw.js")), pre(HEAD("sw.js")), "sw.js: the precache list is unchanged");
  for (const f of readdirSync(join(ROOT, "netlify/database/migrations"))) {
    ok(HEAD(`netlify/database/migrations/${f}`) !== null, `${f}: a migration this pass added`);
  }
  const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"];
  eq(STATES.length, 49, "fixture: 49 other states");
  // HEAD's card with HEAD's Pennsylvania, Georgia and North Carolina files,
  // against today's with all four.
  const now = bootMI({ state: "Utah" });
  const was = boot({ state: "Utah" }, { "who-represents-me.js": HEAD("who-represents-me.js") });
  for (const f of ["pa-ballot-2026.js", "ga-ballot-2026.js", "nc-ballot-2026.js"]) vm.runInContext(HEAD(f), was, { filename: f + "@HEAD" });
  // The contested seats in Pennsylvania, Georgia and North Carolina, so their
  // act rows are compared too.
  const SEATS = { Pennsylvania: ["6", "16", "12", "18", "144", "160"], Georgia: ["37", "48", "44", "53", "99", "105", "151"],
    "North Carolina": ["7", "11", "18", "42", "25", "37", "98", "105"] };
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
  for (const k of Object.keys(B)) if (String(B[k].state) === "Michigan") eq(JSON.stringify(RO[k]), JSON.stringify(B[k]), `${k}: shell moved`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no equity language");
// ═════════════════════════════════════════════════════════════════════════════
{
  const added = (now, was) => now.split("\n").filter((l) => was.indexOf(l) < 0).join("\n");
  for (const f of ["mi-ballot-2026.js", "ballot-mi.html"]) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
  for (const f of ["who-represents-me.js", "index.html", "voice.html", "find.html", "netlify.toml", "district-voice.js",
    "district-board.js", "pa-ballot.css", "sw.js", "scripts/gen-district-boards.mjs"]) {
    ok(!EQUITY.test(added(R(f), HEAD(f) || "")), `${f}: this pass added equity language`);
  }
  for (const f of readdirSync(ROOT).filter((f) => /^district-mi-(?:hd|sd)-\d+\.html$/.test(f))) ok(!EQUITY.test(R(f)), `${f}: carries equity language`);
}

console.log(`\n${failures.length ? "✗" : "✓"} mi contested cycle: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("   ✗ " + f);
process.exit(failures.length ? 1 : 0);
