#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — WAVE 4, VERIFIED AGAINST THE DATABASE THAT ACTUALLY HAS IT
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS. scripts/vr-utah-fpi.mjs measures the seeds. That is the right
// thing for a curator pass — the seed is what was reviewed — but it cannot tell
// you whether the migration generated from that seed put the same rows in a
// database. This file asks the database, and it compares row for row rather
// than count for count, because two files can agree on 1,116 and disagree on
// who voted which way.
//
//   node scripts/vr-utah-wave4-verify.mjs               # reconcile + doctrine
//   node scripts/vr-utah-wave4-verify.mjs --member PID  # ...and one member's
//                                                       # tiers, live vs applied
//   node scripts/vr-utah-wave4-verify.mjs --member PID --origin https://host
//
// READ-ONLY, AND STRUCTURALLY SO. The connection the platform hands this
// environment authenticates as a read-only role; the script opens no write path
// and holds no DDL. It prints the database name and the branch name and never
// the connection string.
//
// WHAT "APPLIED" MEANS HERE. Netlify applies migrations itself, immediately
// before a deploy is published, and the migration ledger is not in a table this
// role can read. So nothing below claims to have read a ledger. It reads the
// ROWS, reconciles them against the seed each migration was generated from, and
// reports the branch it read them on — which is the honest form of the claim.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { getDatabase } from "@netlify/database";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const argOf = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] || "" : ""; };
const ONE = argOf("member");

const FLOOR = ["db/vr-utah-vote-seed.json", "db/vr-utah-vote-seed-2024GS.json", "db/vr-utah-vote-seed-2023GS.json"];
const CMTE = ["db/vr-utah-committee-seed.json", "db/vr-utah-committee-seed-2024GS.json"];
const WAVE4 = ["db/vr-utah-committee-mapping-seed-2025GS.json", "db/vr-utah-committee-mapping-seed-2024GS.json"];

// ── The seed side of every comparison ────────────────────────────────────────
const seed = { floorMeasures: 0, rollcalls: 0, memberVotes: 0, cmteMeasures: 0, cmtePositions: 0,
               w4Measures: 0, mappings: new Map(), positions: new Set() };
for (const f of FLOOR) for (const m of J(f).measures || []) {
  seed.floorMeasures++;
  for (const rc of m.rollcalls || []) { seed.rollcalls++; seed.memberVotes += (rc.votes || []).length; }
}
for (const f of CMTE) for (const m of J(f).measures || []) {
  seed.cmteMeasures++;
  for (const a of m.committeeActs || []) seed.cmtePositions += (a.votes || []).length;
}
for (const f of WAVE4) for (const m of J(f).measures || []) {
  seed.w4Measures++;
  for (const i of m.issues || []) seed.mappings.set(`${m.session}|${m.utahBill}|${i.issueKey}`,
    { weight: i.weight, isPrimary: !!i.isPrimary, supportMeaning: i.supportMeaning });
  for (const a of m.committeeActs || []) for (const v of a.votes || [])
    seed.positions.add(`${m.session}|${m.utahBill}|${v.politicianId}|${!!v.supports}`);
}

const db = getDatabase();
const q = async (sql, args) => (await db.pool.query(sql, args)).rows;
const W4 = `m.external_ids->>'committeeOnly' = 'true'`;
let bad = 0;
const say = (ok, line) => { if (!ok) bad++; console.log(`  ${ok ? "ok  " : "FAIL"}  ${line}`); };

// ── Where am I reading ───────────────────────────────────────────────────────
const [who] = await q("select current_database() db, current_user usr");
console.log(`\ndatabase ${who.db} · role ${who.usr} · branch ${process.env.NETLIFY_DB_BRANCH || "(unset)"}`);

// ── Reconciliation: the three seed families against the rows on file ─────────
console.log("\nreconciliation — seed vs database");
const [utah] = await q(`
  select (select count(*) from vr_measures where chamber like 'utah%' and external_ids->>'committeeOnly' is null) floor_measures,
         (select count(*) from vr_measures m where chamber like 'utah%' and ${W4}) w4_measures,
         (select count(*) from vr_rollcalls r join vr_measures m on m.id=r.measure_id where m.chamber like 'utah%') rollcalls,
         (select count(*) from vr_member_votes v join vr_rollcalls r on r.id=v.rollcall_id
            join vr_measures m on m.id=r.measure_id where m.chamber like 'utah%') member_votes,
         (select count(*) from vr_positions p join vr_measures m on m.id=p.measure_id
            where m.chamber like 'utah%' and m.external_ids->>'committeeOnly' is null) cmte_positions,
         (select count(*) from vr_positions p join vr_measures m on m.id=p.measure_id where ${W4}) w4_positions,
         (select count(*) from vr_measure_issues i join vr_measures m on m.id=i.measure_id where ${W4}) w4_mappings,
         (select count(*) from vr_rollcalls r join vr_measures m on m.id=r.measure_id where ${W4}) w4_rollcalls`);
say(+utah.floor_measures === seed.floorMeasures, `floor measures ${utah.floor_measures} = seed ${seed.floorMeasures}`);
say(+utah.rollcalls === seed.rollcalls, `roll calls ${utah.rollcalls} = seed ${seed.rollcalls}`);
say(+utah.member_votes === seed.memberVotes, `member votes ${utah.member_votes} = seed ${seed.memberVotes}`);
say(+utah.cmte_positions === seed.cmtePositions, `waves 1-3 committee positions ${utah.cmte_positions} = seed ${seed.cmtePositions}`);
say(+utah.w4_measures === seed.w4Measures, `wave-4 measures ${utah.w4_measures} = seed ${seed.w4Measures}`);
say(+utah.w4_mappings === seed.mappings.size, `wave-4 mappings ${utah.w4_mappings} = seed ${seed.mappings.size}`);
say(+utah.w4_positions === seed.positions.size, `wave-4 positions ${utah.w4_positions} = seed ${seed.positions.size}`);
// THE ONE THING THE MIGRATIONS MUST NOT HAVE DONE. A committee act is not a roll
// call, and wave 4 shipped no floor record. A row here means the file overreached.
say(+utah.w4_rollcalls === 0, `roll calls on a wave-4 measure ${utah.w4_rollcalls} = 0`);

// ── Row for row, not count for count ────────────────────────────────────────
console.log("\nrow-for-row — every wave-4 row against the seed it came from");
const dbMap = await q(`select m.external_ids->>'utahSession' sess, m.external_ids->>'utahBill' bill,
  i.issue_key, i.weight, i.is_primary, i.support_meaning
  from vr_measure_issues i join vr_measures m on m.id=i.measure_id where ${W4}`);
const mBad = [], mSeen = new Set();
for (const r of dbMap) {
  const k = `${r.sess}|${r.bill}|${r.issue_key}`; mSeen.add(k);
  const s = seed.mappings.get(k);
  if (!s) mBad.push(`${k} is in the database and not in the seed`);
  else if (s.weight !== r.weight || s.isPrimary !== r.is_primary || s.supportMeaning !== r.support_meaning)
    mBad.push(`${k} seed ${s.weight}/${s.isPrimary}/${s.supportMeaning} vs db ${r.weight}/${r.is_primary}/${r.support_meaning}`);
}
for (const k of seed.mappings.keys()) if (!mSeen.has(k)) mBad.push(`${k} is in the seed and not in the database`);
say(!mBad.length, `mappings identical on key, weight, primary and direction — ${mBad.length} disagreement(s)`);
for (const x of mBad.slice(0, 10)) console.log(`        ${x}`);

const dbPos = await q(`select m.external_ids->>'utahSession' sess, m.external_ids->>'utahBill' bill,
  p.politician_id, p.supports, p.source_url from vr_positions p join vr_measures m on m.id=p.measure_id where ${W4}`);
const pBad = [], pSeen = new Set();
for (const r of dbPos) {
  const k = `${r.sess}|${r.bill}|${r.politician_id}|${!!r.supports}`; pSeen.add(k);
  if (!seed.positions.has(k)) pBad.push(`${k} is in the database and not in the seed`);
}
for (const k of seed.positions) if (!pSeen.has(k)) pBad.push(`${k} is in the seed and not in the database`);
say(!pBad.length, `positions identical on bill, member and direction — ${pBad.length} disagreement(s)`);
for (const x of pBad.slice(0, 10)) console.log(`        ${x}`);
// voting-record.mts drops a position with no source (`if (!p.posSourceUrl) continue`),
// so a sourceless row would be a row that exists and never renders.
const noSrc = dbPos.filter((r) => !r.source_url);
say(!noSrc.length, `every wave-4 position carries a source the API will emit — ${noSrc.length} without one`);

// ── Doctrine, read off the rows rather than off the decision file ────────────
console.log("\ndoctrine — as the database holds it");
const [d] = await q(`select count(*) filter (where i.is_primary) prim, count(distinct i.measure_id) measures,
  count(*) filter (where not i.is_primary and i.weight > 45) above_narrow,
  count(*) filter (where i.weight < 1 or i.weight > 100) off_scale
  from vr_measure_issues i join vr_measures m on m.id=i.measure_id where ${W4}`);
say(+d.prim === +d.measures, `one primary per measure — ${d.prim} primaries over ${d.measures} measures`);
say(+d.above_narrow === 0, `no secondary above the narrow-link bar of 45 — ${d.above_narrow}`);
say(+d.off_scale === 0, `every weight on the 1-100 scale — ${d.off_scale} off it`);
const shipped = new Set(J("db/issue-keys.json").keys);
const used = (await q(`select distinct i.issue_key k from vr_measure_issues i
  join vr_measures m on m.id=i.measure_id where ${W4}`)).map((r) => r.k);
const off = used.filter((k) => !shipped.has(k));
say(!off.length, `${used.length} distinct keys, all from the shipped ${shipped.size} — ${off.length} invented${off.length ? ": " + off.join(", ") : ""}`);

// ── The roster denominator, measured against rows instead of seeds ───────────
// The FPI's "empty" band is members of the Utah roster with nothing on file. If a
// wave adds a member to the lane the denominator has to say so, and if it adds
// somebody who is not on the roster that is a defect, not a gain.
const UT_OFFICE = /(Utah State|UT State) (Representative|Senator)|Utah (Senate President|House Speaker)|UT (House|Senate) (Speaker|President)/;
const win = makeSandbox();
{
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
}
const roster = new Set();
for (const f of ["db/vr-utah-member-map.json", "db/vr-utah-member-map-2024GS.json", "db/vr-utah-member-map-2023GS.json"]) {
  for (const ch of Object.values(J(f).chambers || {})) for (const v of Object.values(ch)) {
    const pid = v && typeof v === "object" ? v.politicianId : v;
    if (pid) roster.add(pid);
  }
}
for (const pid of Object.keys(win.CMP_DATA || {}))
  if (UT_OFFICE.test((win.CMP_DATA[pid] || {}).office || "")) roster.add(pid);
const withRow = new Set((await q(`select distinct pid from (
  select v.politician_id pid from vr_member_votes v join vr_rollcalls r on r.id=v.rollcall_id
    join vr_measures m on m.id=r.measure_id where m.chamber like 'utah%'
  union all select p.politician_id from vr_positions p join vr_measures m on m.id=p.measure_id
    where m.chamber like 'utah%') t`)).map((r) => r.pid));
const empty = [...roster].filter((p) => !withRow.has(p)).sort();
const strangers = [...withRow].filter((p) => !roster.has(p)).sort();
const w4Members = new Set((await q(`select distinct p.politician_id pid from vr_positions p
  join vr_measures m on m.id=p.measure_id where ${W4}`)).map((r) => r.pid));
console.log("\nroster");
say(!strangers.length, `no pid off the Utah roster carries a Utah row — ${strangers.length}${strangers.length ? ": " + strangers.join(", ") : ""}`);
say(true, `${roster.size} on roster · ${roster.size - empty.length} with a row · ${empty.length} empty`);
say(![...w4Members].some((p) => empty.includes(p)), `wave 4 touched ${w4Members.size} members and none of the empty ${empty.length}`);
console.log(`        empty: ${empty.join(", ")}`);

// ── One member, through the shipped module, live vs applied ──────────────────
// The point of the pass was tiers, so this reads them the only honest way: it
// asks production for the member's record as it stands, asks the database for the
// wave-4 rows production does not have yet, and runs the SHIPPED derivation over
// both. No tier, bar or weight is reimplemented here.
if (ONE) {
  const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
    "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
    "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js"];
  const SRC = FILES.map((f) => [f, R(f)]);
  const boot = () => {
    const w = makeSandbox(); const ctx = vm.createContext(w);
    w.PROFILES = w.CMP_DATA;
    for (const [f, s] of SRC) vm.runInContext(s, ctx, { filename: f });
    w.PROFILES = w.CMP_DATA; return w;
  };
  // THE APEX ORIGIN, DELIBERATELY NOT process.env.URL. The build environment hands
  // this run a www host, and the repo has exactly one public origin — the apex —
  // enforced by scripts/test-canonical-and-origin.mjs. Reading the record from the
  // other host would be reading it through a duplicate.
  const base = (argOf("origin") || "https://politidex" + ".fyi").replace(/\/+$/, "");
  const live = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${base}/api/voting-record/member/${encodeURIComponent(ONE)}?page=${page}&pageSize=100`);
    if (!res.ok) throw new Error(`${base} member ${ONE} page ${page}: HTTP ${res.status}`);
    const body = await res.json();
    live.push(...(body.items || []));
    if (!body.hasMore) break;
  }
  const rows = await q(`select m.id, m.number, m.title, m.chamber, m.status, m.source_label,
      p.supports, p.acted_at, p.source_url,
      coalesce((select json_agg(json_build_object('issueKey', i.issue_key, 'supportMeaning', i.support_meaning,
        'weight', i.weight, 'isPrimary', i.is_primary)) from vr_measure_issues i where i.measure_id = m.id), '[]'::json) issues
    from vr_positions p join vr_measures m on m.id = p.measure_id
    where p.politician_id = $1 and p.action_type = 'committee_vote' and ${W4}`, [ONE]);
  const applied = rows.map((r) => ({
    kind: "position", measureId: r.id, measureType: "bill", number: r.number, title: r.title,
    chamber: r.chamber, status: r.status, date: new Date(r.acted_at).toISOString(),
    action: "committee_vote", actionType: "committee_vote", position: "committee_vote",
    result: null, isParty: null, supports: !!r.supports, isProcedural: false, advanceInverted: false,
    isAmendment: false, parentMeasureId: null, rollcallId: null, congress: null, session: null,
    rollNumber: null, issues: r.issues, source: { url: r.source_url, label: r.source_label },
  }));
  const read = (items) => {
    const w = boot();
    w.PDXVotingRecord.noteMember(ONE, JSON.parse(JSON.stringify(items)));
    const sh = w.PDXConsistency.formalPatternIndex.shape(ONE) || {};
    const tier = new Map();
    for (const r of w.PDXConsistency.formalPatternIndex.rows(ONE) || []) tier.set(r.key, `${r.tier}/j${r.judged}`);
    return { sh, tier };
  };
  const A = read(live), B = read([...live, ...applied]);
  const band = (s) => `issues ${s.issues} · strong ${s.strongN} · split ${s.splitN} · ` +
    `tail ${s.tailN} (read-thin ${s.readThinN} · other side ${s.readOtherN} · no side ${s.thinN})`;
  console.log(`\n${ONE} — ${live.length} item(s) live on ${base}, ${applied.length} wave-4 row(s) in the database`);
  console.log(`  live    ${band(A.sh)}`);
  console.log(`  applied ${band(B.sh)}`);
  for (const k of [...new Set([...A.tier.keys(), ...B.tier.keys()])].sort())
    if (A.tier.get(k) !== B.tier.get(k)) console.log(`    ${k}: ${A.tier.get(k) || "absent"} → ${B.tier.get(k) || "absent"}`);
}

console.log(`\n${bad ? `${bad} check(s) FAILED` : "all checks passed"}`);
await db.pool.end?.();
process.exit(bad ? 1 : 0);
