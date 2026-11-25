#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-ground-truth-live-store.mjs — the Massie, Sanders and Talarico
// ground-truth records, published as stated positions
// ─────────────────────────────────────────────────────────────────────────────
// Every locked record in db/stance-ground-truth-(massie|sanders|talarico)-*.json
// (top-level and additional_records) is filed in the live stance store
// (window.ISSUE_STANCE_DATA, politician-stances.js and its two generated
// chunks) as a campaign-claim stated position, on the record's own issue key,
// with its own support/oppose/mixed value and its own sources.
//
// WHAT THIS SUITE PROVES:
//   1. THE BENCHMARK IS UNTOUCHED: every ground-truth file is byte-for-byte the
//      file pinned below (SHA-256), and the same as HEAD's copy.
//   2. EVERY RECORD IS IN THE STORE: one card per record, under the store's
//      roster id (massie, sanders, james_talarico), with the record's key and
//      value, marked a campaign claim and naming its record in `groundTruth`;
//      its `sources` are the record's sources (link, excerpt, date, type,
//      weight), in order, and its `source` link is one of them. The Talarico
//      cost-of-living record is the earlier flagstone card, unchanged.
//   3. THE READERS SEE IT: the stance map, the one stance store reader
//      (statedStance), the coverage chip and the issue drawer all read the
//      record's value for every record.
//   4. THE THREE LEAF KEYS: ukraine_aid, iran_hostilities and israel_military_aid
//      are in both register copies under Foreign Policy & National Security, in
//      the generated mirrors, and in the related-issues map paired both ways
//      with their subject key. The map stays symmetric.
//
//   node scripts/test-stance-ground-truth-live-store.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { RELATED_ISSUE_KEYS } from "../netlify/lib/related-issue-keys.mjs";
import { INGEST_ID_ALIASES } from "../netlify/lib/raw-ingest-scope.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const HEAD = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

// The benchmark, pinned. A changed byte in any file fails here.
const GT_SHA256 = {
  'stance-ground-truth-massie-abolish-education.json': 'e723504fddceb10719849c12096277cf9bfc6648949f6e1891f6fb5a4fe0fe79',
  'stance-ground-truth-massie-abortion.json': '45e5aa7749bd2700a965426569881ade0bf4ded40da6bc44397daa0875f2fc74',
  'stance-ground-truth-massie-border.json': '45b8488ec7da62d70091a8c1bc889fd590cba5c70f0afb192911edc83b230e3b',
  'stance-ground-truth-massie-cbdc.json': 'c48cb054640eb225b5eb0cfe08f9d67bf73c74ba1c3c5c709e2251384300382d',
  'stance-ground-truth-massie-checks-on-executive.json': '8f22406d10b92a790c112bb521cbb57d3e9a6bb3d1cddc83d0c7601f8efe3b73',
  'stance-ground-truth-massie-disclosure.json': '27cb38ee6dc3bc4f8ce630fdb2929b23435488aa21d50c9deabbf730e056d733',
  'stance-ground-truth-massie-earmarks.json': 'f8337f5ae433cd0e3c68215fa4a11faeb2e69b8c919ab349ce0f4f8c5619edeb',
  'stance-ground-truth-massie-epstein-files.json': 'dd6bcc4fade9e459dae53ac3067598e272949cad94c94d1f66b3f9f0e179de8c',
  'stance-ground-truth-massie-federal-reserve.json': 'a7c38d82ddf1a58834e89d4f834277a1f43631b04a1c07c278c158396610f818',
  'stance-ground-truth-massie-federal-spending.json': '55cfee5649f6b8ffeeaf144f78c88451af700977cbb1b1fdc7dfc735d93c764d',
  'stance-ground-truth-massie-food-freedom.json': '88cb90b20013e62b4b4036ca618cafeb919dc1a1adc92f0b64fdd3fcd2434777',
  'stance-ground-truth-massie-foreign-aid.json': 'a0dc7c317cfeca2dd6eeac317df5ecf1a18555b0abb6f34c073741a8d33f4c5f',
  'stance-ground-truth-massie-free-speech.json': 'a4446c18a21d307ec0b1de2642970b697aad95207ac897c8686c0505212c2f68',
  'stance-ground-truth-massie-medical-freedom.json': 'd735b222602b852cb9388ae6f6f02628fe69f1864243efa97a37e33b5a3c138b',
  'stance-ground-truth-massie-school-choice.json': 'cc90cca945c3751e24857ea02a81010595bc52aeb5adb8c492fcd56fd5bbc876',
  'stance-ground-truth-massie-second-amendment.json': 'eb64045e7defb46345821864b524d93b7d8d868caa08de1e3e87376e95282a75',
  'stance-ground-truth-massie-surveillance.json': '04f545a35f16495ea8ea2ad3ee8dde5cbfcf5b63445ef6adc60d33b71109f92d',
  'stance-ground-truth-massie-tariff-authority.json': '5e0f515b5600720100d1831ccbec9f3c4de2b43a38570035227971ccf123e91b',
  'stance-ground-truth-sanders-child-care.json': '4bf9b286e390ad3d8e1c1c15b2c6ccf277015cfe1209a11d7166cca94da4e1b3',
  'stance-ground-truth-sanders-climate.json': '304a12e3016cf725814d9e4ba9d554a00c0cb43f3bf6aac0e6801d62ceb44181',
  'stance-ground-truth-sanders-college-cost.json': '7b7cdc4ed42813d87fcadf4528144b37f4cb799216cd7776b7b518571cbecc0e',
  'stance-ground-truth-sanders-corporate-accountability.json': '4d91c10e0541cc8bb4435111194cead202b7988b31ec52b4d9315b1c780b22cd',
  'stance-ground-truth-sanders-drug-prices.json': '52a83f7c93fc4ebe8c61beda28f9dc2cb50b618ab4fe8e2d08c6164a3a0cbf8a',
  'stance-ground-truth-sanders-housing.json': '615b6c4cd04f80bd2ea39222e325b96ee3fe35c478a89bd68ae393dd0e122bff',
  'stance-ground-truth-sanders-military-spending.json': 'e5cfe8830a7e11e12fc6dce726420612452e4a27c4d0c00294f96586364a16be',
  'stance-ground-truth-sanders-money-in-politics.json': '046b7c5742187a218753c876d6c0673509ce58afbab890983591328781c6bb5c',
  'stance-ground-truth-sanders-paid-leave.json': '7f5763d1f95f8d97a3cf3b1db81186d8970761a5d9bd3b93064f7a36e03002fe',
  'stance-ground-truth-sanders-reproductive-rights.json': '6ea7755bc511e5d37c8ddda3d7bf41d1434a92fac04d5e39b430ae040c543155',
  'stance-ground-truth-sanders-social-security.json': 'ff32492ebb545a8982a203c3d1061bdd86bfec83141f6cd02abc4a7e38476ce0',
  'stance-ground-truth-sanders-trade.json': 'c47bf25cb306fd3728adc644b2da3e61b2d55f413c8faf64893ebe749e78963e',
  'stance-ground-truth-sanders-wealth-tax.json': 'c4608822c9425a54561fc324b507d1aab493e66702a642e1458a4fdf1f66fdcc',
  'stance-ground-truth-sanders-workers-wages.json': 'bf279c629a205bd0a2f6c4cff233d8b7d336b42afb534e2ef217283ccc32fdec',
  'stance-ground-truth-talarico-cannabis.json': 'af34cda9006e8eae1c79f33427e90d25b8bc421988461242e43ab8394f2dadce',
  'stance-ground-truth-talarico-child-care.json': 'ab6a336331e3fee8e93315f30ba54d7cbbf13349e52465edb8d468c364127552',
  'stance-ground-truth-talarico-cost-of-living.json': 'f2889f2a8e30dbae8f4bd099719ed2c53f290a9fb1a017ca0a3601b46da59586',
  'stance-ground-truth-talarico-drug-prices.json': '0e4f69ef6d67fbfad35859f61317ada4fbca374bd14dfec84f899ef2a083d9b3',
  'stance-ground-truth-talarico-healthcare-access.json': 'f752e671f8702a4223fdfa01b91e42414c3a4d2636e7dd841855575e7fd0d503',
  'stance-ground-truth-talarico-money-in-politics.json': '42c992d5c668836e56f63dd34ce5cd834bf21e8628e43aad4c3edabf4c910baf',
  'stance-ground-truth-talarico-paid-leave.json': '6dcdfb06d368b3c021c9e615ae14c86b6ee9989fe3c010436de3eadab23651f4',
  'stance-ground-truth-talarico-redistricting.json': '2867550b4566fcf33de48572d9c623e63f97bd8e7e598e8b83b818e4a7a86837',
  'stance-ground-truth-talarico-reproductive-rights.json': '4c318c3dc033b6208fb1bd60b3e11001537d19bc8bf7d02865b53ecbd96354e4',
  'stance-ground-truth-talarico-social-security.json': '4ba54ace4bf2ca5e9951c58d2f0708da2a45decaa6fb4d65ce0c10440c3187f5',
  'stance-ground-truth-talarico-stock-trading.json': 'a0acc4863b5e03e87d487af82671fba1ce6f829591228b3eb85aaaba7d1d3706',
  'stance-ground-truth-talarico-supreme-court.json': 'c5bccbe2b32596fd9ac2336735a5fb46373d9de26cbac3a019bbc21ac703620e',
  'stance-ground-truth-talarico-term-limits.json': '032bc94780ff73ba2bf307c0bb4efd8848aab01a6cab81b5a5b85682392132f1',
  'stance-ground-truth-talarico-voting-access.json': '5661710162fec702de6b6b18dce83a58b18c1e5aa9de97e7921dcc2f20d73dd6',
  'stance-ground-truth-talarico-workers-wages.json': '11f8225468723eb9dd649542e24c20444c90ce84c107eeda7d7736650c67c391',
};
const GT_RE = /^stance-ground-truth-(massie|sanders|talarico)-.*\.json$/;
const STORE_PID = { massie: "massie", sanders: "sanders", james_talarico: "james_talarico" };
const NEW_KEYS = {
  ukraine_aid: { subject: "ukraine_policy", pairs: ["ukraine_policy", "america_first_fp", "restraint", "war_powers"] },
  iran_hostilities: { subject: "iran_policy", pairs: ["iran_policy", "war_powers", "restraint", "no_new_wars"] },
  israel_military_aid: { subject: "israel_support", pairs: ["israel_support", "strong_defense", "america_first_fp", "restraint"] },
};
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes", mixed: "Stated: Mixed" };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the ground-truth files are byte-for-byte unchanged");
// ═════════════════════════════════════════════════════════════════════════════
const files = readdirSync(join(ROOT, "db")).filter((f) => GT_RE.test(f)).sort();
eq(JSON.stringify(files), JSON.stringify(Object.keys(GT_SHA256).sort()), "the set of ground-truth files changed");
const before = {};
for (const f of files) {
  const buf = readFileSync(join(ROOT, "db", f));
  before[f] = sha(buf);
  eq(before[f], GT_SHA256[f], `${f}: content changed`);
  const h = HEAD(`db/${f}`);
  if (h) ok(Buffer.compare(h, buf) === 0, `${f}: differs from HEAD`);
}
const records = [];
for (const f of files) {
  const j = JSON.parse(R(`db/${f}`));
  for (const r of [j, ...(j.additional_records || [])]) records.push({ file: f, r });
}
ok(records.length >= 52, `too few ground-truth records (${records.length})`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every record is in the live stance store with its key, value and sources");
// ═════════════════════════════════════════════════════════════════════════════
const stanceData = (src) => { const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w)); return w.ISSUE_STANCE_DATA || {}; };
const SRC = stanceData(R("politician-stances.js"));
const CHUNKS = stanceData(R("politician-stances-core.js") + "\n" + R("politician-stances-ext.js"));
ok(INGEST_ID_ALIASES.thomas_massie === "massie", "thomas_massie no longer resolves to the roster id massie");
for (const pid of Object.values(STORE_PID)) {
  eq(JSON.stringify(CHUNKS[pid]), JSON.stringify(SRC[pid]), `${pid}: the stance chunks are not regenerated from politician-stances.js`);
}
const cardOf = (r) => {
  const list = SRC[STORE_PID[r.politician_id]] || [];
  const tagged = list.filter((c) => c.groundTruth === r.stance_id);
  if (tagged.length) return { card: tagged[0], n: tagged.length, flagstone: false };
  // The flagstone record (the first written in the locked schema) predates the tag.
  const fl = r.stance_id === "james_talarico|cost_living|gt-001" ? list.find((c) => c.issueKey === r.topic && Array.isArray(c.sources)) : null;
  return { card: fl, n: fl ? 1 : 0, flagstone: true };
};
for (const { file, r } of records) {
  const id = `${file} · ${r.stance_id}`;
  ok(r.politician_id in STORE_PID, `${id}: politician ${r.politician_id} is not one of the three`);
  const { card: c, n, flagstone } = cardOf(r);
  if (!ok(!!c, `${id}: not in the live stance store`)) continue;
  eq(n, 1, `${id}: filed more than once`);
  eq(c.issueKey, r.topic, `${id}: issue key`);
  eq(c.issueStance, r.position, `${id}: stance value`);
  eq(c.pos, r.position, `${id}: pos`);
  eq(c.position, r.position, `${id}: position`);
  eq(c.status, "active", `${id}: status`);
  ok(Array.isArray(c.sources) && c.sources.length, `${id}: no sources`);
  ok(/^https:\/\//.test((c.source && c.source.url) || ""), `${id}: no source link`);
  const links = r.sources.map((s) => s.link);
  ok(links.includes(c.source && c.source.url) || flagstone, `${id}: the card's source is not one of the record's`);
  if (flagstone) continue;
  eq(c.claim, "campaign", `${id}: not marked a campaign claim`);
  ok(/^Campaign claim, not a vote — /.test(c.detail || ""), `${id}: no campaign-claim line`);
  ok(!("evidence" in c), `${id}: carries an evidence field`);
  ok(typeof c.text === "string" && c.text.length > 20 && c.text.length <= 240, `${id}: text missing or too long`);
  eq(c.sources.length, r.sources.length, `${id}: source count`);
  r.sources.forEach((s, i) => {
    const m = c.sources[i] || {};
    for (const k of ["type", "date", "link", "excerpt", "weight"]) eq(m[k], s[k], `${id}: source ${i} ${k}`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the person page, the stance store reader and the drawer read each record");
// ═════════════════════════════════════════════════════════════════════════════
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js",
];
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); } }
win.PROFILES = win.CMP_DATA;
const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
for (const { r } of records) {
  const pid = STORE_PID[r.politician_id], id = r.stance_id;
  ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
  ok(!!win.ISSUE_MAP[r.topic], `${id}: ${r.topic} is not in the register`);
  ok(Array.isArray(RI.MAP[r.topic]), `${id}: ${r.topic} is not in the related-issues map`);
  const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
  eq(pm[r.topic] && pm[r.topic].stance, r.position, `${id}: the stance map`);
  const s = CS.statedStance(pid, r.topic);
  eq(s && s.side, r.position, `${id}: statedStance`);
  eq(CS.stanceCoverage(pid, r.topic).chip, SAYS[r.position], `${id}: coverage chip`);
  const h = CS.gapViewHtml(pid, r.topic) || "";
  ok(h.includes(SAYS[r.position]), `${id}: the drawer does not print "${SAYS[r.position]}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the three leaf keys: register, mirrors and a symmetric related-issues map");
// ═════════════════════════════════════════════════════════════════════════════
{
  const region = (s) => { const a = s.indexOf("    var ISSUE_MAP = {"); const b = s.indexOf("window._pdxEvidenceCategories", a); return s.slice(a, b); };
  eq(region(R("alignment-tool.js")), region(R("issue-map.js")), "alignment-tool.js and issue-map.js registers differ");
  const keysJson = JSON.parse(R("db/issue-keys.json"));
  const core = JSON.parse(R("db/issue-core-categories.json"));
  const coreStr = JSON.stringify(core);
  for (const [k, d] of Object.entries(NEW_KEYS)) {
    ok(!!win.ISSUE_MAP[k], `${k}: not in the register`);
    eq(win.ISSUE_MAP[k] && win.ISSUE_MAP[k].cat, "foreign", `${k}: category`);
    eq(win.coreIssueForKey(k) && win.coreIssueForKey(k).key, "foreign_policy_defense", `${k}: core issue`);
    eq(win.coreIssueForKey(d.subject) && win.coreIssueForKey(d.subject).key, "foreign_policy_defense", `${k}: subject key's core issue moved`);
    ok(keysJson.keys.includes(k), `${k}: not in db/issue-keys.json`);
    ok(coreStr.includes(`"${k}"`), `${k}: not in db/issue-core-categories.json`);
    ok(RELATED_ISSUE_KEYS.includes(k), `${k}: not in netlify/lib/related-issue-keys.mjs`);
    eq(JSON.stringify(RI.MAP[k]), JSON.stringify(d.pairs), `${k}: related pairs`);
    for (const p of d.pairs) eq((RI.MAP[p] || []).slice(-3).includes(k) || (RI.MAP[p] || []).at(-1) === k, true, `${p}: does not list ${k} last`);
  }
  for (const [a, list] of Object.entries(RI.MAP)) {
    for (const b of list) ok((RI.MAP[b] || []).includes(a), `the related-issues map is not symmetric: ${a} → ${b}`);
    ok(!!win.ISSUE_MAP[a], `map key ${a} is not in the register`);
  }
  for (const k of Object.keys(win.ISSUE_MAP)) ok(Array.isArray(RI.MAP[k]), `register key ${k} is not in the map`);
}

// The benchmark, once more after every read above.
for (const f of files) eq(sha(readFileSync(join(ROOT, "db", f))), before[f], `${f}: changed during the run`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s) (${passed} passed):`);
  for (const f of failures.slice(0, 60)) console.error("  - " + f);
  process.exit(1);
}
console.log(`\n✓ ground-truth stated positions in the live store: ${records.length} records, ${passed} checks passed`);
