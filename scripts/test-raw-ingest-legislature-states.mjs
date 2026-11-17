#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-legislature-states.mjs — official member directories for
// board states beyond Utah (db/legislature-listings-2026-11.json →
// db/raw-ingest-legislature-directory-2026-11.json), read by the existing
// state-legislature URL resolver.
//
//   · Each new directory is limited to board states, comes from the
//     legislature's own listing, and its page patterns are confirmed by pages
//     already cited on the site (same chamber, same person).
//   · A page-less legislator in a newly covered state receives an official
//     page on a clean match and is planned.
//   · Ambiguous, wrong-chamber, non-matching and unconfirmed-pattern cases
//     stay without a page.
//   · Utah resolutions and every previously resolved row are unchanged.
//   · Scoring and Evidence Locker code do not reference the new directories.
//
//   node scripts/test-raw-ingest-legislature-states.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corePath = path.join(root, "netlify/lib/raw-ingest-core.mjs");
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
const core = await import(pathToFileURL(corePath).href);
const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const DIR = read("db/raw-ingest-legislature-directory-2026-11.json");
const LIST = read("db/legislature-listings-2026-11.json");
const NEW = Object.keys(DIR.states).filter((s) => s !== "UT");

// Baseline: the same roster build with a Utah-only directory (what existed before this pass).
const tmpDir = path.join(root, "db", ".tmp-legislature-directory-utah-only.json");
fs.writeFileSync(tmpDir, JSON.stringify({ ...DIR, states: { UT: DIR.states.UT } }));
const tmpCore = path.join(root, "netlify/lib", ".tmp-raw-ingest-core-utah-only.mjs");
fs.writeFileSync(tmpCore, fs.readFileSync(corePath, "utf8").replace("../../db/raw-ingest-legislature-directory-2026-11.json", "../../db/.tmp-legislature-directory-utah-only.json"));
let before;
try { before = await import(pathToFileURL(tmpCore).href); }
finally { fs.rmSync(tmpCore, { force: true }); fs.rmSync(tmpDir, { force: true }); }

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}
const pagesOf = (r) => [...(r.sources || []), ...(r.official ? [r.official] : [])];
const rowOf = (ros, pid) => ros.find((r) => r.politician_id === pid);
const plain = (x) => JSON.parse(JSON.stringify(x));
const host = (u) => new URL(u).hostname.replace(/^www\./, "");
const OWN_HOST = { VT: "legislature.vermont.gov", NY: "nyassembly.gov", PA: "palegis.us", FL: "flsenate.gov", CA: "senate.ca.gov" };
// On the legislature's own host, or a member host under it (sd11.senate.ca.gov).
const onHost = (u, st) => host(u) === OWN_HOST[st] || host(u).endsWith(`.${OWN_HOST[st]}`);
const siteText = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js", "acct-spotlight-data.js", "cmp-data.js",
  ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f))].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const newlyResolved = core.RESOLUTION.resolved.filter((x) => x.via === "legislature_directory" && x.state !== "UT");

await t("each new directory is limited to board states, read from the legislature's own listing, with patterns confirmed by cited pages", () => {
  execFileSync(process.execPath, [path.join(root, "scripts/build-raw-ingest-legislature-directory-2026-11.mjs"), "--check"], { stdio: "pipe" });
  const boards = new Set(Object.keys(SEAT_HOLDERS).filter((k) => /-state(?:house|senate)-/.test(k)).map((k) => k.split("-")[0].toUpperCase()));
  assert.ok(NEW.length >= 3, `new directories: ${NEW.join(", ")}`);
  for (const st of NEW) {
    const d = DIR.states[st];
    assert.ok(boards.has(st), `${st} has legislative district boards`);
    // Source: the legislature's own listing; every listed member page on its own host.
    assert.ok(LIST.listings[st]?.sources.length && LIST.listings[st].sources.every((u) => onHost(u, st)), `${st}: listing is on ${OWN_HOST[st]}`);
    assert.equal(d.members.length, LIST.listings[st].members.length, `${st}: directory = the listing`);
    for (const m of d.members) {
      assert.ok(["house", "senate"].includes(m.chamber) && m.id && m.name);
      if (m.url) assert.ok(onHost(m.url, st), `${m.url} on the legislature's host`);
    }
    for (const [ch, tpl] of Object.entries(d.member_page)) {
      const conf = d.confirmed_by[ch] || [];
      assert.ok(conf.length, `${st} ${ch}: confirmed by cited pages`);
      for (const u of conf) {
        assert.ok(siteText.includes(u), `${u} is cited on the site`);
        assert.ok(onHost(u, st), `${u} on ${OWN_HOST[st]}`);
        const seg = [new URL(u).hostname.split(".")[0], ...new URL(u).pathname.split("/").filter(Boolean)];
        assert.ok(d.members.some((m) => m.chamber === ch && seg.includes(m.id)), `${u} names a listed ${ch} member`);
      }
      // Every address the directory can produce is on the legislature's own host.
      for (const m of d.members.filter((x) => x.chamber === ch)) {
        const u = R.legislatureMemberUrl(m, d);
        assert.ok(u && onHost(u, st), `${st} ${m.id}: ${u}`);
      }
    }
  }
  // Every board state is covered or recorded as skipped, with a reason.
  for (const st of boards) assert.ok(DIR.states[st]?.member_page && Object.keys(DIR.states[st].member_page).length || DIR.skipped[st], `${st}: covered or skipped`);
  // A pattern whose cited page names someone else is refused (Florida Senate: S26 cited for Ben Albritton, listed as another senator).
  assert.deepEqual(DIR.states.FL?.member_page || {}, {});
  assert.match(DIR.skipped["FL senate"], /S26 is cited for ben_albritton/);
  // A chamber with no cited page of its own is not covered (Vermont House).
  assert.ok(!DIR.states.VT.member_page.house);
});

await t("a page-less legislator in a newly covered state receives an official page on a clean match and is planned", () => {
  assert.ok(newlyResolved.length >= 30, `${newlyResolved.length} new legislature pages`);
  for (const [pid, seat, url] of [
    ["hardy_vt", "vt-statesenate-", "https://legislature.vermont.gov/people/single/2026/30978"],
    ["bendett_ny", "ny-statehouse-107", "https://nyassembly.gov/mem/Scott-Bendett"],
    ["coleman_pa", "pa-statesenate-16", "https://www.palegis.us/senate/members/bio/2008/sen-coleman"],
  ]) {
    assert.ok(Object.entries(SEAT_HOLDERS).some(([k, h]) => k.startsWith(seat) && h.pid === pid), `${pid} holds a ${seat} board seat`);
    assert.equal(pagesOf(rowOf(before.ROSTER, pid)).length, 0, `${pid} had no page`);
    const r = rowOf(core.ROSTER, pid);
    assert.deepEqual(r.sources.map((s) => s.url), [url]);
    assert.equal(r.sources[0].resolved_by, "legislature_directory");
    assert.equal(r.sources[0].source_class, "state_legislature");
    const plan = core.planRun({}, { roster: [r], counts: {} });
    assert.ok(plan.politicians.includes(pid) && plan.sources.some((s) => s.url === url), `${pid} is planned`);
  }
  // Each new page is in the member's own state and chamber, and the member's listed name matches the roster name.
  for (const x of newlyResolved) {
    const r = rowOf(core.ROSTER, x.politician_id);
    const m = DIR.states[x.state].members.find((y) => y.id === x.member_id && y.chamber === x.chamber);
    assert.ok(R.sameName(R.directoryName(m.name), r.name), `${x.politician_id}: ${m.name} ↔ ${r.name}`);
    if (r.board_seat) { assert.equal(r.state, x.state); assert.equal(r.chamber, x.chamber); }
  }
});

await t("ambiguous, wrong-chamber, non-matching and unconfirmed cases stay without a page", () => {
  // Fixture shaped like the Pennsylvania directory (listing addresses).
  const d = { member_page: { senate: "{url}" }, confirmed_by: { senate: ["https://www.palegis.us/senate/members/bio/1/x"] }, members: [
    { id: "10", chamber: "senate", name: "Pat Twin", url: "https://www.palegis.us/senate/members/bio/10/sen-twin" },
    { id: "11", chamber: "senate", name: "Patrick Twin", url: "https://www.palegis.us/senate/members/bio/11/sen-twin" },
    { id: "12", chamber: "senate", name: "Rowan Upper", url: "https://www.palegis.us/senate/members/bio/12/sen-upper" },
    { id: "13", chamber: "senate", name: "Clean Match", url: "https://www.palegis.us/senate/members/bio/13/sen-match" },
    { id: "14", chamber: "senate", name: "Off Host", url: "https://example.com/bio/14" },
  ] };
  const P = (n, o) => ({ n, o, s: "Pennsylvania" });
  const people = { twin: P("Pat Twin", "Pennsylvania State Senator"), upper: P("Rowan Upper", "Pennsylvania State Representative"),
    nobody: P("Nobody Here", "Pennsylvania State Senator"), clean: P("Clean Match", "Pennsylvania State Senator"), offhost: P("Off Host", "Pennsylvania State Senator") };
  const roster = Object.keys(people).map((pid) => ({ politician_id: pid, tier: 3, sources: [] }));
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: [], legislature: { states: { PA: d } } });
  const why = new Map(rep.unresolved.map((u) => [u.politician_id, u.why]));
  assert.deepEqual(rowOf(roster, "clean").sources.map((s) => s.url), ["https://www.palegis.us/senate/members/bio/13/sen-match"]);
  assert.match(why.get("twin"), /2 PA senate members match/);
  assert.match(why.get("upper"), /listed in the PA senate, not the house/);
  assert.match(why.get("nobody"), /no PA senate member named/);
  assert.match(why.get("offhost"), /no senate member-page pattern/, "a listing address off the confirmed host is refused");
  for (const pid of ["twin", "upper", "nobody", "offhost"]) assert.deepEqual(rowOf(roster, pid).sources, []);
  // Real roster: Vermont House members (pattern not confirmed) and Florida senators (pattern refused) stay page-less.
  for (const [prefix, why2] of [["vt-statehouse-", "VT house"], ["fl-statesenate-", "FL senate"]]) {
    const pids = Object.entries(SEAT_HOLDERS).filter(([k]) => k.startsWith(prefix)).map(([, h]) => h.pid);
    assert.ok(pids.length);
    for (const pid of pids) { const r = rowOf(core.ROSTER, pid); if (r) assert.ok(!r.sources.some((s) => s.resolved_by === "legislature_directory"), `${pid} (${why2}) not resolved`); }
  }
  // A Vermont senator not in the listing stays page-less.
  assert.deepEqual(rowOf(core.ROSTER, "lyons_vt").sources, []);
  assert.match(core.RESOLUTION.unresolved.find((u) => u.politician_id === "lyons_vt").why, /no VT senate member named/);
});

await t("Utah resolutions and all previously resolved rows are unchanged", () => {
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  const prev = before.RESOLUTION.resolved.map(key);
  assert.deepEqual(core.RESOLUTION.resolved.filter((x) => !(x.via === "legislature_directory" && x.state !== "UT")).map(key), prev, "every earlier resolution identical (Congress.gov, cited, Utah)");
  assert.equal(core.RESOLUTION.resolved.filter((x) => x.via === "legislature_directory" && x.state === "UT").length, 3);
  const added = new Set(newlyResolved.map((x) => x.politician_id));
  assert.equal(core.ROSTER.length, before.ROSTER.length);
  for (const [i, b] of before.ROSTER.entries()) {
    const r = core.ROSTER[i];
    assert.equal(r.politician_id, b.politician_id);
    if (!added.has(b.politician_id)) { assert.deepEqual(plain(r), plain(b), `${b.politician_id} unchanged`); continue; }
    assert.equal(pagesOf(b).length, 0, `${b.politician_id} had no pages`);
    assert.equal(r.tier, b.tier);
    assert.ok(r.sources.length === 1 && r.sources[0].resolved_by === "legislature_directory");
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k]);
  const first = core.planRun({}, { counts: {} });
  assert.ok(first.politicians.every((p) => rowOf(core.ROSTER, p).tier === 1), "tier order unchanged");
});

await t("scoring and Evidence Locker code do not reference the new directories", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(s, /legislature-listings|legislature-directory|LEGISLATURE_DIRECTORY|legislature_directory|raw-ingest-resolve|resolved_by/, `${f}`);
  }
  // Nothing in the cron or core fetches a listing: the listings are a committed file.
  for (const f of ["netlify/lib/raw-ingest-core.mjs", "netlify/lib/raw-ingest-resolve.mjs", "netlify/functions/raw-ingest-cron.mts"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), "utf8"), /legislature-listings|fetch-legislature-listings/, `${f} does not read the listings`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest legislature states: ${passed} passed, 0 failed`);
