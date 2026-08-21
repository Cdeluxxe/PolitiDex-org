#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-densify-ledger-sample.mjs — the two samples the August 2026 densification
// pass has to be able to show
// ─────────────────────────────────────────────────────────────────────────────
// 20260910000000_vr_densify_underweighted_landmarks.sql widened two heavily-voted
// measures off their single headline key onto the provisions their text supports:
//
//   H.R. 6955 (119) Main Street Capital Access Act
//       gov_regulation    w85 secondary yea_supports
//       econ_corp_account w60 secondary yea_opposes
//   H.R. 2670 (118) FY24 National Defense Authorization Act
//       privacy_rights    w45 secondary yea_opposes   (Sec. 7902, FISA Title VII)
//
// The claim the pass makes is narrow and this file is where it is checked, on the
// two cases that pull in opposite directions:
//
//   LEDGER-ONLY — maxine_waters on gov_regulation. She has a recorded nay on
//   H.R. 6955 and no stated position on the key; the pass deliberately did not
//   write her one, because the only thing she said in the window was about this
//   bill. The row must therefore stay OUT of Direction Match and still show the
//   instrument, its date, her ballot, and which way the mapping runs.
//
//   SAID + DID — boebert on privacy_rights. She has a recorded yea on H.R. 2670,
//   and this pass gave her a stated position sourced to her own quoted words in
//   the Surveillance Accountability Act release. The row must now be IN Direction
//   Match, and it must resolve against the mapping's own direction: privacy_rights
//   is yea_opposes, so a yea cuts against an issue she says she is for.
//
// The direction primitive is the load-bearing one. `support_meaning` is what tells
// the engine a yea advances the issue AND that a nay cuts against it, and both
// halves are asserted here — a mapping only defensible read forwards is not
// defensible.
//
// Votes are seeded the way a completed /api/voting-record fetch leaves the cache,
// with the real measure identities, real dates, real ballots and the real mapping
// rows read out of db/vr-issue-seed.json — so a mapping edited in the seed without
// its migration, or a direction flipped in either, surfaces here.
//
//   node scripts/test-densify-ledger-sample.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js", "stance-tree.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ densify sample: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h)
  .replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();

// ── The mapping rows, read from the curated seed rather than restated ────────
const SEEDJSON = JSON.parse(R("db/vr-issue-seed.json"));
const seedList = Array.isArray(SEEDJSON) ? SEEDJSON : (SEEDJSON.measures || SEEDJSON.rows || []);
const findMeasure = (number, congress) =>
  seedList.find((m) => m.number === number && Number(m.congress) === congress);

const HR6955 = findMeasure("H.R. 6955", 119);
const HR2670 = findMeasure("H.R. 2670", 118);
must(HR6955 && HR2670, "db/vr-issue-seed.json no longer carries both measures this pass widened");

const issuesOf = (m) => (m.issues || m.mappings || []).map((i) => ({
  issueKey: i.issueKey || i.issue_key,
  weight: Number(i.weight),
  isPrimary: !!(i.isPrimary ?? i.is_primary),
  supportMeaning: i.supportMeaning || i.support_meaning,
}));
const I6955 = issuesOf(HR6955), I2670 = issuesOf(HR2670);
const row = (list, key) => list.find((i) => i.issueKey === key);

section("0 · the mappings this pass added are in the curated seed, as curated");
{
  const gr = row(I6955, "gov_regulation");
  must(gr, "H.R. 6955 lost its gov_regulation mapping");
  eq(gr.weight, 85, "gov_regulation on H.R. 6955 is weighted 85");
  eq(gr.isPrimary, false, "…as a secondary slice, not the bill's headline");
  eq(gr.supportMeaning, "yea_supports", "…and a yea enacts the regulatory relief");

  const ca = row(I6955, "econ_corp_account");
  must(ca, "H.R. 6955 lost its econ_corp_account mapping");
  eq(ca.weight, 60, "econ_corp_account on H.R. 6955 is weighted 60");
  eq(ca.isPrimary, false, "…as a secondary slice");
  eq(ca.supportMeaning, "yea_opposes",
    "…and a yea removes a competition check, so it cuts AGAINST corporate accountability");

  const pr = row(I2670, "privacy_rights");
  must(pr, "H.R. 2670 lost its privacy_rights mapping");
  eq(pr.weight, 45, "privacy_rights on H.R. 2670 is weighted 45 — a provision slice, not the bill");
  eq(pr.isPrimary, false, "…and never the primary key of a defense authorization");
  eq(pr.supportMeaning, "yea_opposes",
    "…a yea extends FISA Title VII, so it cuts against privacy");

  // The headline keys are untouched: densification adds provisions, it does not
  // re-file the bill.
  eq((row(I6955, "econ_smallbiz") || {}).isPrimary, true, "H.R. 6955 is still primarily a small-business bill");
  eq((row(I2670, "strong_defense") || {}).isPrimary, true, "H.R. 2670 is still primarily a defense authorization");
}

// ── The record set, as the API would leave it ────────────────────────────────
const mk = (o) => ({
  kind: "vote", rollcallId: o.roll, measureId: o.measureId, number: o.number,
  date: o.date, action: o.action, position: o.position, isProcedural: false,
  title: o.title,
  source: { url: o.url, label: "Congress.gov" },
  issues: o.issues.map((i) => ({
    issueKey: i.issueKey, weight: i.weight, isPrimary: i.isPrimary,
    supportMeaning: i.supportMeaning,
  })),
});
const VOTE_6955 = (position) => mk({
  roll: 271, measureId: 6955, number: "H.R. 6955", date: "2026-07-22",
  action: "On Passage", position, title: "Main Street Capital Access Act",
  url: "https://www.congress.gov/bill/119th-congress/house-bill/6955", issues: I6955,
});
const VOTE_2670 = (position) => mk({
  roll: 723, measureId: 2670, number: "H.R. 2670", date: "2023-12-14",
  action: "On Motion to Suspend the Rules and Agree to the Conference Report",
  position, title: "National Defense Authorization Act for Fiscal Year 2024",
  url: "https://www.congress.gov/bill/118th-congress/house-bill/2670", issues: I2670,
});

const W = boot();
must(W.PDXConsistency && W.PDXConsistency.ledger, "PDXConsistency.ledger is not exposed");
const CS = W.PDXConsistency, LED = CS.ledger;

// Real ballots: waters nay on H.R. 6955 (house 119/2 roll 271), boebert yea on
// H.R. 2670 (house 118/1 roll 723).
W.PDXVotingRecord.noteMember("maxine_waters", [VOTE_6955("nay")]);
W.PDXVotingRecord.noteMember("boebert", [VOTE_2670("yea")]);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · ledger-only — maxine_waters / gov_regulation, on record and unscored");
// ═════════════════════════════════════════════════════════════════════════════
const stanceKeys = (pid) => new Set(
  (W._resolveStanceList(pid, W.CMP_DATA[pid]) || []).map((s) => s && s.issueKey).filter(Boolean));

ok(!stanceKeys("maxine_waters").has("gov_regulation"),
  "the pass left maxine_waters unscored on gov_regulation — no stated position was written");

const ovW = CS.officialRecord("maxine_waters", "gov_regulation");
must(ovW, "no official record resolved for maxine_waters on gov_regulation");
eq((ovW.record || {}).total, 1, "her gov_regulation record holds the one instrument this pass mapped");
ok(LED.onRecord(ovW) === true, "the issue is on the formal record");
ok(LED.unscored(ovW) === true, "…and outside Direction Match, because nothing was stated");

{
  const items = CS.dossierItems("maxine_waters", "gov_regulation") || [];
  eq(items.length, 1, "count equals list: one instrument claimed, one instrument listed");
  const d = items[0];
  has(d.ident, "H.R. 6955", "the instrument names itself");
  has(String(d.date || ""), "2026", "…and carries its date");
  has(String(d.act || ""), "Nay", "…and her actual ballot");
  eq(LED.itemDir(d.item, d.lane, "gov_regulation"), "opposes",
    "a nay on a yea_supports mapping cuts against the issue — the direction reads backwards as well as forwards");
}

// The split line is a count of mapped directions and says so, with no rate anywhere.
{
  const split = LED.split("maxine_waters", "gov_regulation", ovW);
  eq(split.listed, 1, "the split counted the one listed instrument");
  eq(split.directional, 1, "one instrument carries a direction");
  eq(split.opposes, 1, "…and it is counted on the cutting-against side");
  eq(split.advances, 0, "…with nothing on the advancing side");
  const line = txt(LED.splitLine(split, "gov_regulation"));
  has(line, "Counts of mapped directions, not a score.", "the disclaimer rides with the count");
  ok(!/\d+\s?%/.test(line), "…and no percentage appears anywhere near it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · said + did — boebert / privacy_rights, now in Direction Match");
// ═════════════════════════════════════════════════════════════════════════════
ok(stanceKeys("boebert").has("privacy_rights"),
  "boebert now holds a stated position on privacy_rights");

const bStance = (W._resolveStanceList("boebert", W.CMP_DATA.boebert) || [])
  .find((s) => s && s.issueKey === "privacy_rights");
must(bStance, "the boebert privacy_rights card is unreachable from the resolver");
eq(bStance.pos, "support", "she is recorded as for the issue");
ok(!/\bH\.?R\.?\s?\d+/i.test(bStance.text), "the position does not cite a measure number");
ok(!/\bvot(ed|ing)\b|cosponsor/i.test(bStance.text), "…and is not written as a vote");
has(bStance.source.url, "massie.house.gov", "…and is sourced to the release carrying her own words");
ok(!/clerk\.house\.gov|roll_?call/i.test(bStance.source.url),
  "…which is not a roll call, so the two halves of the card are two documents");

const ovB = CS.officialRecord("boebert", "privacy_rights");
must(ovB, "no official record resolved for boebert on privacy_rights");
eq((ovB.record || {}).total, 1, "her privacy_rights record holds the one instrument this pass mapped");
ok(LED.unscored(ovB) === false,
  "the row is IN Direction Match now that both halves exist — this is the new tested row");

{
  const items = CS.dossierItems("boebert", "privacy_rights") || [];
  eq(items.length, 1, "count equals list on the tested row too");
  const d = items[0];
  has(d.ident, "H.R. 2670", "the instrument names itself");
  eq(LED.itemDir(d.item, d.lane, "privacy_rights"), "opposes",
    "a yea on a yea_opposes mapping cuts against the issue — she says for, the act runs against");
}

// The verdict is allowed to be whatever the arithmetic makes it; what is asserted
// is that one exists and that it was decided on the formal lane, not inferred.
{
  const rows = CS.issueRows("boebert") || [];
  const r = rows.find((x) => x.key === "privacy_rights");
  must(r, "privacy_rights did not appear among boebert's issue rows");
  const res = CS.rowResult(r);
  must(res, "the row does not resolve");
  ok(!!res.state, `the row has a state (${res.state})`);
  ok(res.state !== "unread", "…and it is not the unread placeholder");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the same mapping, read from the other side");
// ═════════════════════════════════════════════════════════════════════════════
// A support_meaning is a claim about both ballots. Seeding the opposite vote must
// flip the direction and nothing else — if it does not, the mapping is a one-way
// assertion wearing a two-way field.
{
  const V = boot();
  V.PDXVotingRecord.noteMember("maxine_waters", [VOTE_6955("yea")]);
  V.PDXVotingRecord.noteMember("boebert", [VOTE_2670("nay")]);
  const L = V.PDXConsistency.ledger;
  const a = V.PDXConsistency.officialRecord("maxine_waters", "gov_regulation");
  const b = V.PDXConsistency.officialRecord("boebert", "privacy_rights");
  const da = (V.PDXConsistency.dossierItems("maxine_waters", "gov_regulation") || [])[0];
  const db = (V.PDXConsistency.dossierItems("boebert", "privacy_rights") || [])[0];
  must(da && db, "the flipped-ballot fixture lost its instruments");
  const dirA = L.itemDir(da.item, da.lane, "gov_regulation");
  const dirB = L.itemDir(db.item, db.lane, "privacy_rights");
  eq(dirA, "advances", "a yea on H.R. 6955 advances cutting federal red tape");
  eq(dirB, "advances", "a nay on H.R. 2670 advances privacy — the FISA slice read backwards");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no second score anywhere in what this pass added");
// ═════════════════════════════════════════════════════════════════════════════
{
  const surfaces = [];
  for (const [pid, key] of [["maxine_waters", "gov_regulation"], ["boebert", "privacy_rights"]]) {
    const ov = CS.officialRecord(pid, key);
    const sp = LED.split(pid, key, ov);
    surfaces.push(txt(LED.splitLine(sp, key)), txt(LED.splitSay(sp)), txt(LED.dirLong("opposes", key)));
  }
  const blob = surfaces.join(" ");
  for (const re of [/party unity/i, /loyalty/i, /\bwith (?:his|her|their) party\b/i, /\b\d+%\s*(?:of|voting)/i]) {
    ok(!re.test(blob), `no ${re.source} framing on a ledger surface`);
  }
}

if (failures.length) {
  console.error(`\n✗ densify sample: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`  • ${f}`));
  process.exit(1);
}
console.log(`\n✓ densify sample: ${passed} assertions passed — one ledger-only issue, one said+did issue, directions readable both ways`);
