#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-board-holders.mjs — the sitting holder of every legislative
// seat with a district board is on the raw-ingest rotation roster
// (db/raw-ingest-full-roster-2026-11.json `board_seat` rows).
//
//   · Every legislative board seat's sitting member is present on the roster
//     (own id or an alias); no candidate or non-holder is added.
//   · Previously existing roster rows are unchanged.
//   · The Congress.gov and state-legislature directory resolvers still only
//     store pages on clean matches; a board-seat row with no clean match stays
//     page-less and is skipped by the planner.
//   · Scoring and Evidence Locker code do not depend on the new rows.
//
//   node scripts/test-raw-ingest-board-holders.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corePath = path.join(root, "netlify/lib/raw-ingest-core.mjs");
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
const core = await import(pathToFileURL(corePath).href);
const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const SHARE = read("db/share-index.json");
const FULL = read("db/raw-ingest-full-roster-2026-11.json");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "cmp-data.js"), "utf8"), ctx);
const CMP = ctx.window.CMP_DATA;

// The roster exactly as it was before this pass: the same build with the
// board-seat rows taken out of the committed full-roster file.
const prevFile = path.join(root, "db", ".tmp-full-roster-before-board-holders.json");
fs.writeFileSync(prevFile, JSON.stringify({ ...FULL, politicians: FULL.politicians.filter((r) => !r.board_seat) }));
const src = fs.readFileSync(corePath, "utf8").replace("../../db/raw-ingest-full-roster-2026-11.json", "../../db/.tmp-full-roster-before-board-holders.json");
const prevCorePath = path.join(root, "netlify/lib", ".tmp-raw-ingest-core-before-board-holders.mjs");
fs.writeFileSync(prevCorePath, src);
let before;
try { before = await import(pathToFileURL(prevCorePath).href); }
finally { fs.rmSync(prevCorePath, { force: true }); fs.rmSync(prevFile, { force: true }); }

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const plain = (x) => JSON.parse(JSON.stringify(x));
const LEG_SEATS = Object.entries(SEAT_HOLDERS).filter(([k]) => /^[a-z]{2}-state(?:house|senate)-/.test(k));
const ids = new Set(core.ROSTER.map((r) => r.politician_id));
const aliasTargets = new Set(core.ROSTER.map((r) => SHARE.personAliases?.[r.politician_id]).filter(Boolean));
const onRoster = (pid) => ids.has(pid) || ids.has(SHARE.personAliases?.[pid]) || aliasTargets.has(pid);
const boardRows = core.ROSTER.filter((r) => r.board_seat);

await t("every legislative board seat's sitting member is present on the rotation roster", () => {
  assert.ok(LEG_SEATS.length >= 1954, `legislative board seats (${LEG_SEATS.length})`);
  for (const [seat, h] of LEG_SEATS) assert.ok(h?.pid && onRoster(h.pid), `${seat}: ${h?.pid} is on the roster`);
  assert.equal(new Set(core.ROSTER.map((r) => r.politician_id)).size, core.ROSTER.length, "one row per politician");
  assert.ok(boardRows.length > 1500, `board holders added (${boardRows.length})`);
  for (const r of boardRows) {
    const [, st, ch, d] = /^([a-z]{2})-state(house|senate)-(.+)$/.exec(r.board_seat);
    assert.equal(SEAT_HOLDERS[r.board_seat].pid, r.politician_id, `${r.politician_id} is the sitting holder of ${r.board_seat}`);
    assert.equal(r.state, st.toUpperCase()); assert.equal(r.chamber, ch); assert.equal(r.district, d);
    const rec = CMP[r.politician_id];
    assert.ok(rec && !rec.candidate, `${r.politician_id} is a sitting member on the site`);
    assert.doesNotMatch(r.office, /candidate|former/i);
    assert.equal(r.name, rec.name); assert.equal(r.office, rec.office); assert.equal(r.state_listed, rec.state);
    assert.equal(r.tier, 3, "tier 3, like every other full-roster row");
    assert.equal(r.has_board, true);
    assert.ok(r.full_roster);
    assert.ok(!r.official);
    assert.ok(r.sources.every((s) => s.resolved_by), "no configured or invented page");
    assert.ok(!before.ROSTER.some((b) => b.politician_id === r.politician_id), `${r.politician_id} was absent before`);
  }
  // Only seat holders: every board-seat row maps to exactly one legislative seat.
  const seats = new Set(LEG_SEATS.map(([k]) => k));
  assert.ok(boardRows.every((r) => seats.has(r.board_seat)));
  assert.equal(new Set(boardRows.map((r) => r.board_seat)).size, boardRows.length);
  // The resolver sees each one as a sitting state legislator of the right chamber.
  for (const r of boardRows) {
    const id = R.identityOf(r.politician_id, { n: r.name, o: r.office, s: r.state_listed });
    assert.ok(id.state_legislator, `${r.politician_id} (${r.office}) reads as a sitting legislator`);
    assert.equal(R.legislativeChamber(r.office), r.chamber, `${r.politician_id}: chamber from office`);
    assert.equal(id.state, r.state);
  }
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-full-roster-2026-11.mjs"), "--check"], { stdio: "pipe" });
});

await t("previously existing roster rows are unchanged", () => {
  assert.equal(core.ROSTER.length, before.ROSTER.length + boardRows.length, "rows only added");
  for (const [i, b] of before.ROSTER.entries()) {
    assert.equal(core.ROSTER[i].politician_id, b.politician_id, "existing rows keep their order; new rows follow");
    assert.deepEqual(plain(core.ROSTER[i]), plain(b), `${b.politician_id} unchanged (pages, tier, resolved pages)`);
  }
  // The 116 board holders who were already rotating (own id or alias) are untouched and not duplicated.
  const already = LEG_SEATS.filter(([, h]) => before.ROSTER.some((b) => b.politician_id === h.pid || SHARE.personAliases?.[h.pid] === b.politician_id || SHARE.personAliases?.[b.politician_id] === h.pid));
  assert.equal(already.length, LEG_SEATS.length - boardRows.length);
  assert.ok(already.length >= 116, `${already.length} already present`);
  for (const [, h] of already) assert.ok(!boardRows.some((r) => r.politician_id === h.pid));
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k], `${k} unchanged`);
  // Planned order for rows that had pages is unchanged.
  const order = (c) => c.priorityOrder(c.ROSTER, {}).filter((x) => x.open.length || x.filled.length).map((x) => x.r.politician_id);
  assert.deepEqual(order(core), order(before));
});

await t("the Congress.gov and state-legislature directory resolvers still only store pages on clean matches", () => {
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  assert.deepEqual(core.RESOLUTION.resolved.map(key), before.RESOLUTION.resolved.map(key), "earlier resolutions identical");
  const byPid = new Map(core.RESOLUTION.resolved.map((x) => [x.politician_id, x]));
  for (const r of boardRows) {
    const x = byPid.get(r.politician_id);
    if (!x) { assert.equal(pagesOf(r).length, 0, `${r.politician_id}: no clean match → no page`); continue; }
    // Any page a board-seat row gets is a clean directory match in its own state and chamber.
    assert.equal(x.via, "legislature_directory");
    assert.equal(x.state, r.state); assert.equal(x.chamber, r.chamber);
  }
  // Page-less board-seat rows are skipped by the planner, as before.
  const pageless = boardRows.filter((r) => !pagesOf(r).length);
  const plan = core.planRun({}, { roster: pageless.slice(0, 50), counts: {} });
  assert.equal(plan.politicians.length, 0, "nothing to pull → not planned");
  // With a directory for their state, a board-seat row resolves on a clean match only.
  const pick = boardRows.find((r) => r.state === "VT" && r.chamber === "house");
  const twin = boardRows.find((r) => r.state === "VT" && r.chamber === "senate");
  const roster = [pick, twin, boardRows.find((r) => r.state === "MN")].map((r) => ({ ...r, sources: [] }));
  const people = Object.fromEntries(roster.map((r) => [r.politician_id, { n: r.name, o: r.office, s: r.state_listed }]));
  const tok = R.nameTokens(pick.name);
  const legislature = { states: { VT: { member_page: { house: "https://legislature.vermont.gov/people/single/2026/{id}" },
    members: [{ id: "111", name: `Rep. ${tok[tok.length - 1]}, ${tok[0]}`, chamber: "house" }, { id: "222", name: `Sen. ${R.nameTokens(twin.name).at(-1)}, ${R.nameTokens(twin.name)[0]}`, chamber: "house" }] } } };
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: [], legislature });
  assert.deepEqual(roster[0].sources.map((s) => s.url), ["https://legislature.vermont.gov/people/single/2026/111"], "clean match in state + chamber");
  assert.deepEqual(roster[1].sources, [], "a senator listed only in the House does not match");
  assert.deepEqual(roster[2].sources, [], "a state with no directory does not match");
  assert.equal(rep.resolved.length, 1);
});

await t("scoring and Evidence Locker code do not depend on the new rows", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(s, /board_seat|full-roster|FULL_ROSTER|full_roster|raw-ingest-resolve/, `${f} does not read the new rows`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest board holders: ${passed} passed, 0 failed`);
