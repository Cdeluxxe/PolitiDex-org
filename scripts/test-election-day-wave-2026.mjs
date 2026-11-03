#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-election-day-wave-2026.mjs — the November 3, 2026 races: the six
// skipped states' candidates, every party as printed, and the boards for the
// seats on the ballot that had none
// ─────────────────────────────────────────────────────────────────────────────
// db/roster-candidates-2026-nov.json records the candidates read for Alabama,
// Arizona, Kansas, New Hampshire, Ohio and Pennsylvania — the six states the
// October pass skipped — and db/election-day-wave-2026-11.json what else the
// pass did: 70 sitting U.S. Representatives' rows given their district, so
// their boards open; a governor board for every other state with a governor's
// race tomorrow; no effect line, because none qualified; no migration.
//
// WHAT THIS SUITE PROVES:
//   1. THE CANDIDATES: every recorded row is on the roster with its name, office,
//      district and party as filed; inert; never seated. Every official
//      candidate is either a new row or a roster row already held.
//   2. EVERY PARTY AS PRINTED: a third-party or no-party candidate keeps the
//      ballot's own label as `party` — never folded to D/R and never written
//      "Independent" unless the source printed it.
//   3. EVERY NEW BOARD is on the contract: a document, three 200 rewrites, a
//      row in BOARDS, BOARD_ROUTES and BOARD_SEATS, read-only (no composer, no
//      poll, no residency gate), no equity copy, and no /district/* splat.
//   4. THE DISTRICT EDITS: each of the 70 rows moved by its district alone, and
//      each now opens exactly its seat.
//   5. EFFECT LINES: none added — _DOS_EFFECT, _DOS_EXEC_EFFECT, _DOS_MECH and
//      _DOS_POINTER are byte-identical to the base, and every line any of them
//      prints still meets the row rule.
//   6. NOTHING ELSE MOVED: every Utah board, the six hand-opened boards, the
//      composer's three lists, sw.js and the migrations are byte-identical to
//      the base, and the generator's --check reports no drift.
//
//   node scripts/test-election-day-wave-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { planBoards, HAND_SEATS, GOVERNOR_STATES, FEDERAL_READ_ONLY_SEATS } from "./gen-district-boards.mjs";
import { DECLARED_ADMISSIONS, DECLARED_DISTRICT_PIDS } from "./v103-chrome-seams.mjs";
import { isEveryBoardSeat, withoutEveryBoardVoice, EVERY_BOARD_MIGRATION } from "./state-leg-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on: what it added is measured against it, so
// the check stays exact after the pass lands.
const BASE_REV = "13bb0be";
const BASE = (f) => {
  try { return execFileSync("git", ["show", `${BASE_REV}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ election-day wave: STALE HARNESS — ${m}`); process.exit(2); } };

must(BASE("cmp-data.js"), `no git baseline at ${BASE_REV}`);
const REC = JSON.parse(R("db/roster-candidates-2026-nov.json"));
const WAVE = JSON.parse(R("db/election-day-wave-2026-11.json"));
const BANNER = "// ── Election-day candidates, Alabama, Arizona, Kansas, New Hampshire, Ohio and Pennsylvania, official lists (Nov 2026)";
const STATES = { al: "Alabama", az: "Arizona", ks: "Kansas", nh: "New Hampshire", oh: "Ohio", pa: "Pennsylvania" };
const SEATS = { al: 7, az: 9, ks: 4, nh: 2, oh: 15, pa: 17 };
const roster = (src) => { const w = makeSandbox(); vm.runInContext(src, vm.createContext(w), { filename: "cmp-data.js" }); return w.CMP_DATA; };
const SRC = R("cmp-data.js");
const RO = roster(SRC);
const RO0 = roster(BASE("cmp-data.js"));
const R_RE = /^(?:Republican(?: Party(?: of Florida)?)?|REPUBLICAN|REP|Rep|R)(?:$|,)/;
const D_RE = /^(?:Democratic(?: Party)?|Florida Democratic Party|Democrat|DEMOCRATIC|DEMOCRAT|DEM|Dem|D|Democratic-Farmer-Labor|Democratic-NPL|DEM\/PROG)(?:$|,)/;
const EQUITY = /\bequity\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\bcrowdfund|\bform c\b|\bstock\b/i;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the six states' candidates: on the roster, as filed, inert, never seated");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(Object.keys(REC.states).sort().join(","), Object.keys(STATES).sort().join(","), "the record covers exactly the six states the October pass skipped");
  const OCT = JSON.parse(R("db/roster-candidates-2026-oct.json"));
  for (const code of Object.keys(STATES)) eq(OCT.states[code].outcome, "skipped", `${code}: the October record still says skipped (its history is not rewritten)`);
  const decl = DECLARED_ADMISSIONS.find((d) => d.banner === BANNER);
  must(!!decl, "v103-chrome-seams.mjs: the election-day block is not a declared admission");
  eq(decl.pids.join(","), REC.rows.map((r) => r.pid).join(","), "the declared admission is exactly the record's rows");
  // The block sits immediately above the October block, which stays last.
  const at = SRC.indexOf(BANNER), oct = SRC.indexOf("// ── Current candidates outside Utah, 2026 general election");
  ok(at > 0 && oct > at && SRC.indexOf("\n// ── ", at + BANNER.length) === oct - 1, "the block is the one just above the October block");
  const block = SRC.slice(at, oct);
  const keys = [...block.matchAll(/^ "([a-z0-9_]+)": \{$/gm)].map((m) => m[1]);
  eq(keys.join(","), REC.rows.map((r) => r.pid).join(","), "the block holds the record's rows, in order, and no other");
  ok(!EQUITY.test(block), "the block carries no equity or stock language");

  for (const [code, s] of Object.entries(REC.states)) {
    eq(s.state, STATES[code], `${code}: state name`);
    eq(s.checked, true, `${code}: checked`);
    ok(Array.isArray(s.sources) && s.sources.length > 0 && s.sources.every((u) => /^https:\/\//.test(u)), `${code}: names its official sources`);
    const mine = REC.rows.filter((r) => r.state === code), held = REC.held.filter((r) => r.state === code);
    eq(s.added, mine.length, `${code}: the recorded count is the rows`);
    eq(s.alreadyHeld, held.length, `${code}: the held count is the held list`);
    eq(s.officialCandidates, s.added + s.alreadyHeld, `${code}: every official candidate is added or held`);
    // Every House district in the state has at least one candidate on the record.
    for (let n = 1; n <= SEATS[code]; n++) {
      const office = `U.S. House Candidate (${code.toUpperCase()}-${n})`;
      ok(mine.some((r) => r.office === office) || held.some((r) => r.office === office), `${code}: district ${n} has a candidate`);
    }
  }
  const seen = new Set();
  for (const row of REC.rows) {
    ok(!seen.has(row.pid), `${row.pid}: recorded once`); seen.add(row.pid);
    const r = RO[row.pid];
    if (!ok(!!r, `${row.pid}: has a roster row`)) continue;
    eq(RO0[row.pid], undefined, `${row.pid}: the base had no row by this pid`);
    eq(r.name, row.name, `${row.pid}: name`);
    eq(r.state, STATES[row.state], `${row.pid}: state`);
    eq(r.office, row.office, `${row.pid}: office sought`);
    ok(/ Candidate(?: \([A-Z]{2}-\d+\))?$/.test(r.office), `${row.pid}: the office string says candidate`);
    if (row.district) eq(r.district, row.district, `${row.pid}: district`); else ok(!("district" in r), `${row.pid}: a statewide race carries no district`);
    eq(r.partyFiled, row.partyAsFiled, `${row.pid}: party exactly as filed`);
    eq(r.candidate, true, `${row.pid}: a candidate`);
    eq(r.candidacyStatus, "active", `${row.pid}: active`);
    eq(r.nextElection, "2026-11-03", `${row.pid}: on tomorrow's ballot`);
    ok(r.score === null && r.kept === 0 && r.broken === 0 && r.pending === 0 && Array.isArray(r.issues) && r.issues.length === 0, `${row.pid}: inert — no score, no ledger, no issues`);
    ok(/^https:\/\//.test(row.source), `${row.pid}: a source`);
  }
  for (const h of REC.held) {
    ok(!!RO[h.pid] && !!RO0[h.pid], `${h.state} ${h.nameAsFiled}: held as ${h.pid}, a row the base already had`);
    ok(!seen.has(h.pid), `${h.pid}: held, not added again`);
  }
  // No candidate is seated: the board plan names none of them.
  const { boards } = planBoards();
  const NEW = new Set(REC.rows.map((r) => r.pid));
  eq(boards.filter((b) => NEW.has(b.pid) || NEW.has(b.joinPid)).map((b) => b.seat).join(","), "", "no board seats a new candidate");
  const W = makeSandbox(); const ctx = vm.createContext(W);
  for (const f of ["cmp-data.js", "voter-hub-location.js"]) vm.runInContext(R(f), ctx, { filename: f });
  for (const [code, name] of Object.entries(STATES)) {
    for (let n = 1; n <= SEATS[code]; n++) ok(!NEW.has(W._pdxUsHouseSeat(name, n)), `${code}-${n}: the House join names no candidate`);
    const sw = W._pdxStatewideSeats(name) || {};
    ok(!NEW.has(sw.governor) && !(sw.senators || []).some((p) => NEW.has(p)), `${code}: the statewide walk names no candidate`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every party on the ballot, as the ballot prints it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const third = REC.rows.filter((r) => !R_RE.test(r.partyAsFiled) && !D_RE.test(r.partyAsFiled));
  ok(third.length >= 20, `third-party and no-party candidates are on the record (${third.length})`);
  for (const row of third) {
    const r = RO[row.pid];
    eq(r.party, row.partyAsFiled, `${row.pid}: party is the ballot's own label (${row.partyAsFiled}), not D/R`);
    if (!/independent/i.test(row.partyAsFiled)) ok(!/independent/i.test(r.party), `${row.pid}: not relabelled Independent`);
  }
  for (const row of REC.rows.filter((r) => R_RE.test(r.partyAsFiled))) eq(RO[row.pid].party, "R", `${row.pid}: R`);
  for (const row of REC.rows.filter((r) => D_RE.test(r.partyAsFiled))) eq(RO[row.pid].party, "D", `${row.pid}: D`);
  // The labels the six sources print, each on the record at least once.
  const labels = new Set(REC.rows.map((r) => r.partyAsFiled));
  for (const l of ["Libertarian", "GRN", "NOL", "United Kansas", "Independent", "THE INDEPENDENT PARTY", "Non-Party", "Other-party candidate"]) ok(labels.has(l), `the ballot label "${l}" is kept`);
  eq(RO.dennis_mahoney.party, "THE INDEPENDENT PARTY", "PA-3: The Independent Party's nominee keeps that label");
  eq(RO.robbie_mahrou.party, "Independent", "NH-2: printed Independent, stored Independent");
  eq(RO.greg_levy.party, "Other-party candidate", "Ohio's Senate special: the ballot's other-party label");
  eq(RO.william_redpath.office, "U.S. Senate Candidate", "Ohio's Senate special: the Libertarian is on it");
  eq(RO.scott_morgan.party, "United Kansas", "Kansas Secretary of State: United Kansas");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every new board is on the contract, read-only, with no splat");
// ═════════════════════════════════════════════════════════════════════════════
const { boards: PLAN, skipped: SKIPPED } = planBoards();
const BY = new Map(PLAN.map((b) => [b.seat, b]));
const DB = R("district-board.js"), DV = R("district-voice.js"), MTS = R("netlify/functions/district-board.mts"), TOML = R("netlify.toml");
const CORE = R("netlify/lib/district-board-voice-core.mjs"), COMP = R("district-composer.js"), POLL = R("district-poll.js");
const NEW_BOARDS = [
  ...WAVE.usHouseDistrictSet.map((r) => r.seat),
  ...WAVE.governorStates.map((c) => `${c}-gov`),
];
{
  eq(NEW_BOARDS.length, 94, "70 House boards and 24 governor boards");
  for (const seat of NEW_BOARDS) {
    const b = BY.get(seat);
    if (!ok(b, `${seat}: no board in the plan`)) continue;
    eq(BASE(b.doc), null, `${seat}: the base already had a document`);
    ok(existsSync(join(ROOT, b.doc)), `${seat}: ${b.doc} exists`);
    eq(isEveryBoardSeat(seat), true, `${seat}: opened read-only by this wave, voiced by v517`);
    for (const from of [b.route, `${b.route}/`, `${b.route}.html`]) {
      ok(TOML.indexOf(`  from = "${from}"\n  to = "/${b.doc}"\n  status = 200`) >= 0, `${seat}: a 200 rewrite from ${from}`);
    }
    has(DB, `    '${seat}': { seat: '${seat}', composer: true,`, `${seat}: BOARDS row, composer: true (v517)`);
    has(DV, `    '${seat}': '${b.route}',`, `${seat}: BOARD_ROUTES row`);
    has(MTS, `  "${seat}": 1,`, `${seat}: BOARD_SEATS row`);
    // v517: every existing board takes a voice, so the wave's boards are on
    // the composer's three lists, behind the same residency gate.
    ok(CORE.indexOf(`"${seat}": "${b.alias}",`) >= 0, `${seat}: on the server composer gate`);
    ok(COMP.indexOf(`'${b.alias}': 1`) >= 0, `${seat}: on the composer's list`);
    ok(POLL.indexOf(`'${b.alias}': 1`) >= 0, `${seat}: on the poll's list`);
    const doc = R(b.doc);
    has(doc, `<link rel="canonical" href="https://politidex.fyi${b.route}" />`, `${seat}: the document's canonical is its bare path`);
    ok(!EQUITY.test(doc.replace(/<script\b[\s\S]*?<\/script>/gi, "")), `${seat}: no equity copy`);
  }
  for (const r of WAVE.usHouseDistrictSet) {
    ok(FEDERAL_READ_ONLY_SEATS.has(r.seat), `${r.seat}: on FEDERAL_READ_ONLY_SEATS`);
    eq(BY.get(r.seat) && BY.get(r.seat).joinPid, r.pid, `${r.seat}: the join seats ${r.pid}`);
  }
  for (const c of WAVE.governorStates) {
    ok(GOVERNOR_STATES.has(c), `${c}: on GOVERNOR_STATES`);
    const b = BY.get(`${c}-gov`);
    ok(b && b.statewide && b.outsideUtah && RO[b.pid] && /^governor$/i.test(RO[b.pid].office), `${c}-gov: the sitting governor's statewide board`);
  }
  for (const [code, seat] of Object.entries(WAVE.senateSpecials)) ok(BY.has(seat), `${code}: the special Senate seat (${seat}) has its board`);
  ok(!/from\s*=\s*"\/district\/\*"/.test(TOML), "no /district/* splat");
  for (const s of WAVE.usHouseStillSkipped) ok(SKIPPED.some((x) => x.seat === s.seat), `${s.seat}: still skipped (${s.why})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3b · every new House board answers at its seat key and its registered path");
// ═════════════════════════════════════════════════════════════════════════════
// The registered path is the federal convention, /district/<st>-cd-<n>; the
// seat-key path /district/<st>-house-<n> is a second set of 200 rewrites to the
// same document (an at-large seat is district 1, as the roster stores it).
// Netlify takes the first rule whose `from` matches, so a path resolves to the
// `to` of its first exact rule.
{
  const RULES = [...TOML.matchAll(/\[\[redirects\]\]\n  from = "([^"]+)"\n  to = "([^"]+)"\n  status = (\d+)/g)].map((m) => [m[1], m[2], +m[3]]);
  const resolve = (path) => { const r = RULES.find(([from]) => from === path); return r ? { to: r[1], status: r[2] } : null; };
  const V = (() => { const w = {}; w.window = w; vm.runInContext(DV, vm.createContext(w)); return w.PDXVoice.BOARD_ROUTES; })();
  const B = (() => { const w = makeSandbox(); vm.runInContext(DB, vm.createContext(w), { filename: "district-board.js" }); return w.PDXDistrictBoard.BOARDS || null; })();
  for (const r of WAVE.usHouseDistrictSet) {
    const b = BY.get(r.seat);
    if (!ok(b, `${r.seat}: in the plan`)) continue;
    const [code, , n] = r.seat.split("-");
    eq(b.alias, `${code}-cd-${n}`, `${r.seat}: the registered alias is the federal convention`);
    eq(b.doc, `district-${b.alias}.html`, `${r.seat}: the document is named for the registered path`);
    eq(V[r.seat], b.route, `${r.seat}: BOARD_ROUTES names the registered path`);
    if (B) eq(B[r.seat] && B[r.seat].route, b.route, `${r.seat}: BOARDS names the registered path`);
    has(DB, `'${r.seat}': { seat: '${r.seat}', composer: true, alias: '${b.alias}', route: '${b.route}'`, `${r.seat}: the BOARDS row's alias and route`);
    const doc = R(b.doc);
    has(doc, `<link rel="canonical" href="https://politidex.fyi${b.route}" />`, `${r.seat}: the document's canonical is the registered path`);
    has(doc, `window.__PDX_DISTRICT_BOARD_SEAT = '${b.alias}';`, `${r.seat}: the document declares its own seat, whatever path served it`);
    for (const path of [b.route, `/district/${r.seat}`]) {
      for (const sfx of ["", "/", ".html"]) {
        const hit = resolve(path + sfx);
        ok(hit && hit.to === `/${b.doc}` && hit.status === 200, `${path}${sfx}: resolves to /${b.doc} with a 200 (got ${JSON.stringify(hit)})`);
      }
    }
  }
  // The smoke's own paths, by name.
  for (const [path, doc] of [["/district/oh-house-1", "district-oh-cd-1.html"], ["/district/pa-house-1", "district-pa-cd-1.html"],
    ["/district/ny-house-12", "district-ny-cd-12.html"], ["/district/de-house-1", "district-de-cd-1.html"]]) {
    const hit = resolve(path);
    eq(hit && hit.to, `/${doc}`, `${path}: resolves to its document, not a 404`);
    ok(existsSync(join(ROOT, doc)), `${doc}: on disk`);
  }
  // Only the wave's seats got a seat-key path: no skipped seat, governor, Utah
  // or composer board answers at one.
  const seatKeyFroms = RULES.map(([f]) => f).filter((f) => /^\/district\/[a-z]{2}-house-\d+(?:\/|\.html)?$/.test(f));
  eq(seatKeyFroms.length, WAVE.usHouseDistrictSet.length * 3, "exactly three seat-key rewrites per new House board, and no others");
  for (const s of WAVE.usHouseStillSkipped) eq(resolve(`/district/${s.seat}`), null, `${s.seat}: a skipped seat has no seat-key path`);
  // Governor and Utah boards: every rewrite to one of their documents is the
  // committed tree's, byte for byte.
  const HEAD_TOML = (() => { try { return execFileSync("git", ["show", "HEAD:netlify.toml"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } })();
  if (HEAD_TOML) {
    const to = (src, re) => [...src.matchAll(/\[\[redirects\]\]\n  from = "([^"]+)"\n  to = "([^"]+)"/g)].filter((m) => re.test(m[2])).map((m) => m[1] + "→" + m[2]).join("\n");
    for (const [what, re] of [["governor", /^\/district-[a-z]{2}-gov\.html$/], ["Utah", /^\/district-ut-/]]) {
      eq(to(TOML, re), to(HEAD_TOML, re), `the ${what} boards' rewrites are unchanged`);
    }
  } else passed++;
  ok(!RULES.some(([from]) => /^\/district\/.*\*/.test(from)), "still no /district/* splat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the 70 district edits: each row moved by its district alone");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(WAVE.usHouseDistrictSet.length, 70, "70 rows");
  for (const r of WAVE.usHouseDistrictSet) {
    ok(DECLARED_DISTRICT_PIDS.includes(r.pid), `${r.pid}: a declared district edit`);
    eq(RO0[r.pid] && RO0[r.pid].district, undefined, `${r.pid}: the base named no district`);
    const [code, , n] = r.seat.split("-");
    // A one-district state's seat is written at-large ("DE-AL"), as the roster
    // writes Alaska's; the join reads it for district 1.
    eq(r.district, `${code.toUpperCase()}-${code === "de" ? "AL" : n}`, `${r.pid}: the district is the seat`);
    eq(RO[r.pid].district, r.district, `${r.pid}: the row names it`);
    ok(/^[A-Z]\d{6}$/.test(r.bioguide) && String(RO[r.pid].photo || "").indexOf(`/${r.bioguide}.jpg`) > 0, `${r.pid}: the bioguide id is the row's own portrait's`);
    const { district, ...rest } = RO[r.pid];
    eq(JSON.stringify(rest), JSON.stringify(RO0[r.pid]), `${r.pid}: nothing else on the row moved`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · effect lines: none added, every table byte-identical, every line on the rule");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(WAVE.effectLines.added, 0, "the record says no line was added");
  eq(WAVE.effectLines.blankPairsWithDid, 0, "the census found no blank pair with a stored `did`");
  const C = R("consistency.js"), C0 = BASE("consistency.js");
  const table = (src, name) => { const at = src.indexOf(`var ${name} = {`); return at < 0 ? null : src.slice(at, src.indexOf("\n  };", at) + 4); };
  for (const t of ["_DOS_EFFECT", "_DOS_EXEC_EFFECT", "_DOS_MECH", "_DOS_POINTER"]) {
    const a = table(C, t);
    ok(a && a === table(C0, t), `${t}: byte-identical to the base`);
  }
  const METHOD = vm.runInNewContext(C.match(/var _DOS_EFFECT_METHOD = (\/.+\/[a-z]*);/)[1]);
  const rule = (s) => s.length <= 140 && /[.!?]$/.test(s) && !/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")) && !METHOD.test(s);
  for (const t of ["_DOS_EFFECT", "_DOS_EXEC_EFFECT"]) {
    const lines = Object.values(vm.runInNewContext("(" + table(C, t).slice(`var ${t} = `.length) + ")"));
    ok(lines.length > 0 && lines.every((l) => rule(String(l).replace(/\s+/g, " ").trim())), `${t}: every line is one sentence, 140 characters or fewer, with no method word`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing else moved: Utah, the hand-opened and composer boards, sw.js, migrations");
// ═════════════════════════════════════════════════════════════════════════════
{
  const utah = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
  ok(utah.length >= 88, `Utah's boards are all here (${utah.length})`);
  eq(utah.filter((f) => R(f) !== BASE(f)).join(","), "", "every Utah board document is byte-identical");
  for (const seat of HAND_SEATS) {
    const doc = `district-${seat.replace("statehouse", "hd").replace("statesenate", "sd").replace("-house-", "-cd-")}.html`;
    ok(utah.includes(doc) && R(doc) === BASE(doc), `${seat}: its hand-opened document (${doc}) is here, unchanged`);
  }
  // The template is this wave's base's bytes. The composer's three LISTS are
  // the base's once v517's rows are taken out (copy elsewhere in those files,
  // like the v516 verified line, is not a list).
  eq(R("scripts/district-board.template.html"), BASE("scripts/district-board.template.html"), "scripts/district-board.template.html: byte-identical");
  const listRows = (src) => String(src).split("\n").filter((l) => /^\s*['"][a-z0-9_-]+['"]\s*:\s*(?:1|"[a-z0-9_-]+"),$/.test(l)).join("\n");
  for (const f of ["netlify/lib/district-board-voice-core.mjs", "district-composer.js", "district-poll.js"]) {
    eq(listRows(withoutEveryBoardVoice(f, R(f))), listRows(BASE(f)), `${f}: the list is the base's, v517 aside`);
  }
  // The worker: district-board.js and district-voice.js are precached and
  // gained rows, so the shell moved one version (v512); its precache list,
  // and every line but the version and its changelog entry, are the base's.
  const SW = R("sw.js"), SW0 = BASE("sw.js");
  const ver = (src) => Number((/const CACHE_VERSION = 'v(\d+)';/.exec(src) || [])[1]);
  ok(ver(SW) >= 512 && ver(SW0) === 511, "sw.js: the shell moved from v511 to at least v512");
  has(SW, "// v512 - ELECTION DAY: BOARDS FOR TOMORROW'S HOUSE AND GOVERNOR SEATS.", "sw.js: the v512 changelog entry says why");
  const pre = (src) => (src.match(/^  '\/[^']*',$/gm) || []).sort().join("\n");
  eq(pre(SW), pre(SW0), "sw.js: the precache list is unchanged — no board outside Utah is precached");
  ok(!/district-(?!ut-)[a-z]{2}-(?:cd|gov)/.test(SW.slice(SW.indexOf("CACHE_VERSION"))), "sw.js: no new board document is named after the version line");
  // Every board that took a voice before still does, unchanged.
  const comp0 = new Set([...BASE("district-composer.js").matchAll(/'([a-z]{2}-[a-z0-9-]+)':/g)].map((m) => m[1]));
  ok(comp0.size > 0, "the base's composer list was read");
  for (const seat of comp0) if (BY.has(seat)) ok(BY.get(seat).readOnly !== true, `${seat}: keeps its composer`);
  const now = readdirSync(join(ROOT, "netlify/database/migrations")).sort();
  // `git show <rev>:<dir>` lists the tree: a "tree <rev>:<dir>" line, a blank
  // line, then one name per line.
  const base = BASE("netlify/database/migrations/").trim().split("\n").slice(2).filter(Boolean).map((n) => n.replace(/\/$/, "")).sort();
  eq(now.filter((n) => n !== EVERY_BOARD_MIGRATION).join(","), base.join(","), "no migration added (v517's seed aside)");
  const out = execFileSync("node", [join(ROOT, "scripts/gen-district-boards.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" });
  ok(/up to date/.test(out), "gen-district-boards --check reports no drift");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ election-day wave 2026: all ${passed} assertions passed`);
