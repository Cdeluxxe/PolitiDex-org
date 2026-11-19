#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-raw-ingest-legislature-states-ca.mjs — the second legislature-directory
// pass: the California Senate's own member listing (www.senate.ca.gov/senators)
// added to db/legislature-listings-2026-11.json and to
// db/raw-ingest-legislature-directory-2026-11.json, read by the existing
// state-legislature URL resolver on roster build.
//
//   · The new directory is limited to board states, comes from the
//     legislature's own listing, and its page pattern is confirmed by member
//     pages already cited on the site (same member, same chamber). Every board
//     state chamber this pass looked at and could not confirm is recorded.
//   · Page-less legislators in the newly covered chamber receive official
//     pages on clean matches and are planned.
//   · Ambiguous, wrong-chamber, contradicted-pattern and non-matching cases
//     stay without a page.
//   · Every previously resolved row (Congress.gov, cited official pages, Utah,
//     Vermont Senate, New York Assembly, Pennsylvania Senate) is unchanged, and
//     the earlier directories are byte-for-byte what they were.
//   · Scoring and Evidence Locker code do not reference the new directory.
//
//   node scripts/test-raw-ingest-legislature-states-ca.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Steps 1–4 only: step 5 (discovered sources) has its own suite, test-raw-ingest-discovery.mjs.
process.env.PDX_RAW_INGEST_NO_DISCOVERED = "1";
const corePath = path.join(root, "netlify/lib/raw-ingest-core.mjs");
const BUILD = path.join(root, "scripts/build-raw-ingest-legislature-directory-2026-11.mjs");
const R = await import("../netlify/lib/raw-ingest-resolve.mjs");
const core = await import(pathToFileURL(corePath).href);
const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const DIR = read("db/raw-ingest-legislature-directory-2026-11.json");
const LIST = read("db/legislature-listings-2026-11.json");
const CA = DIR.states.CA;

// Baseline: the same roster build with the directory as it was before this
// pass (every state but California).
const { CA: _drop, ...earlier } = DIR.states;
const tmpDir = path.join(root, "db", ".tmp-legislature-directory-before-ca.json");
fs.writeFileSync(tmpDir, JSON.stringify({ ...DIR, states: earlier }));
const tmpCore = path.join(root, "netlify/lib", ".tmp-raw-ingest-core-before-ca.mjs");
fs.writeFileSync(tmpCore, fs.readFileSync(corePath, "utf8").replace("../../db/raw-ingest-legislature-directory-2026-11.json", "../../db/.tmp-legislature-directory-before-ca.json"));
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
const onCaSenate = (u) => host(u) === "senate.ca.gov" || host(u).endsWith(".senate.ca.gov");
const CITING = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "spotlight-cards-data.js", "acct-spotlight-data.js", "cmp-data.js",
  ...fs.readdirSync(root).filter((f) => /^state-senate-stances(?:-w\d+)?\.js$/.test(f))];
const siteText = CITING.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const boards = new Set(Object.keys(SEAT_HOLDERS).filter((k) => /-state(?:house|senate)-/.test(k)).map((k) => k.split("-")[0].toUpperCase()));
const caResolved = core.RESOLUTION.resolved.filter((x) => x.via === "legislature_directory" && x.state === "CA");

await t("the California Senate directory is a board state, read from the Senate's own listing, with its pattern confirmed by cited pages", () => {
  execFileSync(process.execPath, [BUILD, "--check"], { stdio: "pipe" });
  assert.ok(boards.has("CA"), "California has legislative district boards");
  assert.ok(Object.keys(SEAT_HOLDERS).some((k) => k.startsWith("ca-statesenate-")), "and California Senate boards");
  assert.deepEqual(LIST.listings.CA.sources, ["https://www.senate.ca.gov/senators"]);
  assert.equal(CA.members.length, LIST.listings.CA.members.length, "directory = the listing");
  assert.ok(CA.members.length >= 35 && CA.members.length <= 40, `${CA.members.length} sitting senators (40 seats, vacancies excluded)`);
  assert.ok(!CA.members.some((m) => /vacant/i.test(m.name)), "a vacant seat is not a member");
  assert.ok(!CA.members.some((m) => /\b(?:M\.D\.|Ph\.D\.)/.test(m.name)), "degree suffixes are not part of a surname");
  assert.equal(new Set(CA.members.map((m) => m.id)).size, CA.members.length, "one member per ID");
  for (const m of CA.members) {
    assert.equal(m.chamber, "senate");
    assert.match(m.id, /^s[dr]\d{2}$/);
    assert.match(m.name, /^Sen\. [^,]+, .+$/);
    // The address the resolver builds is exactly the listing's own link.
    assert.equal(R.legislatureMemberUrl(m, CA), m.url, `${m.id}: built address = listing link`);
    assert.ok(onCaSenate(m.url), `${m.url} is on the Senate's own host`);
  }
  assert.deepEqual(Object.keys(CA.member_page), ["senate"], "only the Senate is covered");
  assert.ok(CA.confirmed_by.senate.length >= 1);
  // Every confirming page is cited on the site, on a listed senator's own
  // host, for the person the directory lists there.
  const cited = { "https://sd11.senate.ca.gov/": ["wiener_ca", "Scott Wiener"], "https://sd27.senate.ca.gov/biography": ["stern_ca", "Henry Stern"], "https://sd34.senate.ca.gov/biography": ["umberg_ca", "Tom Umberg"] };
  assert.deepEqual(CA.confirmed_by.senate, Object.keys(cited));
  // Who a page is cited for: the stance entry ("pid": [ … ]) it sits in.
  const citedFor = (u) => {
    const pids = new Set();
    for (const f of CITING) {
      const txt = fs.readFileSync(path.join(root, f), "utf8");
      for (let i = txt.indexOf(`"${u}"`); i >= 0; i = txt.indexOf(`"${u}"`, i + 1)) {
        const heads = [...txt.slice(0, i).matchAll(/"([a-z0-9_]+)":\s*\[/g)];
        if (heads.length) pids.add(heads[heads.length - 1][1]);
      }
    }
    return [...pids];
  };
  for (const [u, [pid, name]] of Object.entries(cited)) {
    assert.ok(siteText.includes(u), `${u} is cited on the site`);
    assert.deepEqual(citedFor(u), [pid], `${u} is cited for ${pid}`);
    const m = CA.members.find((x) => x.id === new URL(u).hostname.split(".")[0]);
    assert.ok(m, `${u}: a listed senator`);
    assert.ok(R.sameName(R.directoryName(m.name), name), `${u}: ${m.name} is ${name}`);
  }
  // Every board state chamber this pass could not confirm is recorded with why.
  assert.match(DIR.skipped["CA house"], /Assembly member page/);
  assert.match(DIR.skipped["FL house"], /MemberId=4801/);
  for (const st of boards) assert.ok(Object.keys(DIR.states[st]?.member_page || {}).length || DIR.skipped[st], `${st}: covered or skipped`);
});

await t("the earlier directories and listings are unchanged", () => {
  const expect = {
    UT: { members: 104, member_page: { house: "https://house.utleg.gov/rep/{id}/", senate: "https://senate.utah.gov/sen/{id}/" } },
    VT: { members: 180, member_page: { senate: "https://legislature.vermont.gov/people/single/2026/{id}" }, confirmed_by: { senate: ["https://legislature.vermont.gov/people/single/2024/34727"] } },
    NY: { members: 148, member_page: { house: "https://nyassembly.gov/mem/{id}" }, confirmed_by: { house: ["https://nyassembly.gov/mem/Carl-E-Heastie"] } },
    PA: { members: 50, member_page: { senate: "{url}" }, confirmed_by: { senate: ["https://www.palegis.us/senate/members/bio/1802/senator-katie-muth"] } },
    FL: { members: 40, member_page: {} },
  };
  assert.deepEqual(Object.keys(DIR.states).sort(), ["CA", ...Object.keys(expect)].sort());
  for (const [st, e] of Object.entries(expect)) {
    const d = DIR.states[st];
    assert.equal(d.members.length, e.members, `${st} members`);
    assert.deepEqual(d.member_page, e.member_page, `${st} member_page`);
    if (e.confirmed_by) assert.deepEqual(d.confirmed_by, e.confirmed_by, `${st} confirmed_by`);
    if (st !== "UT") {
      assert.equal(d.members[0].session, LIST.fetched_on, `${st} read date unchanged`);
      assert.equal(LIST.listings[st].fetched_on, undefined, `${st} listing not refetched`);
    }
  }
  assert.ok(LIST.listings.CA.fetched_on && CA.members.every((m) => m.session === LIST.listings.CA.fetched_on), "California read date recorded on its own listing");
  assert.match(DIR.skipped["FL senate"], /S26 is cited for ben_albritton/);
});

await t("page-less legislators in the California Senate receive official pages on clean matches and are planned", () => {
  assert.ok(caResolved.length >= 2, `${caResolved.length} California Senate page(s)`);
  for (const [pid, seat, url] of [
    ["hurtado_ca", "ca-statesenate-16", "https://sd16.senate.ca.gov/"],
    ["blakespear_ca", "ca-statesenate-38", "https://sd38.senate.ca.gov/"],
  ]) {
    assert.equal(SEAT_HOLDERS[seat]?.pid, pid, `${pid} holds ${seat}`);
    assert.equal(pagesOf(rowOf(before.ROSTER, pid)).length, 0, `${pid} had no page`);
    const r = rowOf(core.ROSTER, pid);
    assert.deepEqual(r.sources.map((s) => s.url), [url]);
    assert.equal(r.sources[0].resolved_by, "legislature_directory");
    assert.equal(r.sources[0].source_class, "state_legislature");
    const plan = core.planRun({}, { roster: [r], counts: {} });
    assert.ok(plan.politicians.includes(pid) && plan.sources.some((s) => s.url === url), `${pid} is planned`);
  }
  // Each page is the listed senator's own, and the listed name matches the roster name.
  for (const x of caResolved) {
    const r = rowOf(core.ROSTER, x.politician_id);
    const m = CA.members.find((y) => y.id === x.member_id);
    assert.equal(x.chamber, "senate");
    assert.equal(x.url, m.url);
    assert.ok(R.sameName(R.directoryName(m.name), r.name), `${x.politician_id}: ${m.name} ↔ ${r.name}`);
  }
});

await t("ambiguous, wrong-chamber, contradicted-pattern and non-matching cases stay without a page", () => {
  // Fixture shaped like the California directory (one host per member).
  const d = { member_page: { senate: "https://{id}.senate.ca.gov/" }, confirmed_by: { senate: ["https://sd01.senate.ca.gov/"] }, members: [
    { id: "sd10", chamber: "senate", name: "Sen. Twin, Pat", url: "https://sd10.senate.ca.gov/" },
    { id: "sd11", chamber: "senate", name: "Sen. Twin, Patrick", url: "https://sd11.senate.ca.gov/" },
    { id: "sd12", chamber: "senate", name: "Sen. Upper, Rowan", url: "https://sd12.senate.ca.gov/" },
    { id: "sr13", chamber: "senate", name: "Sen. Match, Clean", url: "https://sr13.senate.ca.gov/" },
  ] };
  const P = (n, o) => ({ n, o, s: "California" });
  const people = { twin: P("Pat Twin", "California State Senator"), upper: P("Rowan Upper", "California State Assembly Member"),
    nobody: P("Nobody Here", "California State Senator"), clean: P("Clean Match", "California State Senator") };
  const roster = Object.keys(people).map((pid) => ({ politician_id: pid, tier: 3, sources: [] }));
  const rep = R.resolveRoster(roster, { people, members: [], cited: {}, retired: [], legislature: { states: { CA: d } } });
  const why = new Map(rep.unresolved.map((u) => [u.politician_id, u.why]));
  assert.deepEqual(rowOf(roster, "clean").sources.map((s) => s.url), ["https://sr13.senate.ca.gov/"]);
  assert.match(why.get("twin"), /2 CA senate members match/);
  assert.match(why.get("upper"), /listed in the CA senate, not the house/);
  assert.match(why.get("nobody"), /no CA senate member named/);
  for (const pid of ["twin", "upper", "nobody"]) assert.deepEqual(rowOf(roster, pid).sources, []);

  // Contradicted pattern: when a cited senator page names someone other than
  // the senator the listing puts on that host, the build refuses the chamber.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pdx-legdir-"));
  try {
    const bad = JSON.parse(JSON.stringify(LIST));
    const m = bad.listings.CA.members.find((x) => x.id === "sd11");
    m.name = "Sen. Someone, Else";
    fs.writeFileSync(path.join(tmp, "listings.json"), JSON.stringify(bad));
    execFileSync(process.execPath, [BUILD, "--listings", path.join(tmp, "listings.json"), "--out", path.join(tmp, "dir.json")], { stdio: "pipe" });
    const out = JSON.parse(fs.readFileSync(path.join(tmp, "dir.json"), "utf8"));
    assert.deepEqual(out.states.CA.member_page, {}, "contradicted pattern refused");
    assert.match(out.skipped["CA senate"], /sd11\.senate\.ca\.gov\/ is cited for wiener_ca/);
    // And with that directory, no California senator resolves.
    const ros = core.ROSTER.filter((r) => ["hurtado_ca", "blakespear_ca"].includes(r.politician_id)).map((r) => ({ ...plain(r), sources: [] }));
    const shareDoc = read("db/share-index.json");
    const rep2 = R.resolveRoster(ros, { people: shareDoc.people, aliases: shareDoc.personAliases, members: [], cited: {}, retired: [], legislature: out });
    assert.equal(rep2.resolved.length, 0);
    assert.ok(ros.every((r) => r.sources.length === 0));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  // Real roster: California Assembly members (chamber not covered) stay page-less.
  const asm = Object.entries(SEAT_HOLDERS).filter(([k]) => k.startsWith("ca-statehouse-")).map(([, h]) => h.pid);
  assert.ok(asm.length);
  for (const pid of asm) { const r = rowOf(core.ROSTER, pid); if (r) assert.ok(!r.sources.some((s) => s.resolved_by === "legislature_directory"), `${pid} (CA Assembly) not resolved`); }
  const wallis = core.RESOLUTION.unresolved.find((u) => u.politician_id === "wallis_ca");
  if (wallis) assert.match(wallis.why, /no CA house member named/);
});

await t("every previously resolved row is unchanged", () => {
  const key = (x) => `${x.politician_id} ${x.via} ${x.url}`;
  // A row the full build resolves through the CA directory is compared by the
  // CA checks above: the directory outranks a direct source, so a row with both
  // (niello_ca, rotating since the share-index refresh) resolves differently
  // without it, by design.
  const viaCa = new Set(core.RESOLUTION.resolved.filter((x) => x.via === "legislature_directory" && x.state === "CA").map((x) => x.politician_id));
  assert.deepEqual(core.RESOLUTION.resolved.filter((x) => !viaCa.has(x.politician_id)).map(key), before.RESOLUTION.resolved.filter((x) => !viaCa.has(x.politician_id)).map(key),
    "Congress.gov, cited official, Utah, Vermont Senate, New York Assembly and Pennsylvania Senate resolutions identical");
  const by = (rep, f) => rep.resolved.filter(f).length;
  for (const [label, f] of [["congress_gov", (x) => x.via === "congress_gov"], ["UT", (x) => x.state === "UT"], ["VT", (x) => x.state === "VT"], ["NY", (x) => x.state === "NY"], ["PA", (x) => x.state === "PA"]]) {
    assert.equal(by(core.RESOLUTION, f), by(before.RESOLUTION, f), label);
  }
  assert.ok(by(before.RESOLUTION, (x) => x.via === "congress_gov") > 0 && by(before.RESOLUTION, (x) => ["VT", "NY", "PA"].includes(x.state)) > 0);
  const added = new Set(caResolved.map((x) => x.politician_id));
  assert.equal(core.ROSTER.length, before.ROSTER.length);
  for (const [i, b] of before.ROSTER.entries()) {
    const r = core.ROSTER[i];
    assert.equal(r.politician_id, b.politician_id);
    if (!added.has(b.politician_id)) { assert.deepEqual(plain(r), plain(b), `${b.politician_id} unchanged`); continue; }
    // No pages before — or only a direct source, which the directory outranks.
    assert.ok(pagesOf(b).every((x) => x.resolved_by === "direct_source"), `${b.politician_id} had no pages (or only a direct source)`);
    assert.equal(r.tier, b.tier);
    assert.ok(r.sources.length === 1 && r.sources[0].resolved_by === "legislature_directory");
  }
  for (const k of ["MAX_SOURCES_PER_RUN", "MAX_POLITICIANS_PER_RUN", "MAX_SOURCES_PER_POLITICIAN", "BASELINE_STRONG", "BASELINE_WEAK", "POOL_VERSION"]) assert.equal(core[k], before[k]);
  const first = core.planRun({}, { counts: {} });
  assert.ok(first.politicians.every((p) => rowOf(core.ROSTER, p).tier === 1), "tier order unchanged");
});

await t("scoring and Evidence Locker code do not reference the new directory", () => {
  for (const f of ["netlify/lib/stance-score-core.mjs", "netlify/lib/evidence-locker-core.mjs", "netlify/lib/stated-positions-core.mjs", "netlify/lib/locker-read.mjs", "netlify/lib/stance-check.mjs"]) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(s, /legislature-listings|legislature-directory|LEGISLATURE_DIRECTORY|legislature_directory|raw-ingest-resolve|resolved_by|senate\.ca\.gov\/senators|\{id\}\.senate\.ca\.gov/, `${f}`);
  }
  // Nothing at runtime fetches the listing: it is a committed file.
  for (const f of ["netlify/lib/raw-ingest-core.mjs", "netlify/lib/raw-ingest-resolve.mjs", "netlify/functions/raw-ingest-cron.mts"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, f), "utf8"), /legislature-listings|fetch-legislature-listings|senate\.ca\.gov/, `${f} does not read the listings`);
  }
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ raw-ingest legislature states (California Senate): ${passed} passed, 0 failed`);
