#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-locker-own-evidence.mjs — locker-own-v1
//
// 1. Only the politician's own pages are evidence (netlify/lib/page-ownership.mjs):
//    their House / Senate office site, campaign site, legislature member page or
//    office site. The House Clerk, White House pages for staff, committee and
//    agency sites (unless the quote is attributed to them by name) and other
//    members' sites are refused — when the cron writes, when the Locker is
//    served and promoted, and by the re-score pass (which retires them).
// 2. Site menus and repeated text (ownEvidenceRows in evidence-locker-core.mjs):
//    a heading on 3+ article pages of one site, or a full sentence on 6+, is
//    dropped; the same sentence on several pages counts once toward Steady and
//    every promotion threshold. Listing pages do not count toward the menu test.
//
//   node scripts/test-locker-own-evidence.mjs
// ═══════════════════════════════════════════════════════════════════════════
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const PO = await imp("netlify/lib/page-ownership.mjs");
const EL = await imp("netlify/lib/evidence-locker-core.mjs");
const SP = await imp("netlify/lib/stated-positions-core.mjs");
const RS = await imp("netlify/lib/locker-rescore.mjs");
const S = await imp("netlify/lib/stance-score-core.mjs");

let pass = 0; const fails = [];
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fails.push(name); console.log(`  ✗ ${name}\n     ${String(e?.message || e).split("\n").join("\n     ")}`); }
}
const own = (link, pid, sourceType = "", quotes = []) => PO.pageOwnership({ link, politicianId: pid, sourceType, quotes });

console.log("locker-own-v1: own pages only, site menus dropped, one sentence counted once");

await t("the politician's own sites are accepted", () => {
  for (const [link, pid] of [
    ["https://benniethompson.house.gov/media/press-releases/x", "bennie_thompson"],
    ["https://blakemoore.house.gov/media/press-releases/x", "bmoore"],
    ["https://ocasio-cortez.house.gov/media/press-releases/x", "aoc"],
    ["https://katherineclark.house.gov/x", "kclark"],
    ["https://leaderarchive-hoyer.house.gov/x", "steny_hoyer"],
    ["https://www.cornyn.senate.gov/issues/health-care/", "john_cornyn"],
    ["https://jamestalarico.com/issue/taxes-cost-of-living/", "james_talarico"],
    ["https://ginafortexas.com/priority/an-affordable-texas-that-works-for-everyone/", "gina_hinojosa"],
    ["https://law.georgia.gov/press-releases/x", "chris_carr"],
    ["https://www.flgov.com/x", "ron_desantis"],
    ["https://www.phoenix.gov/mayor", "kate_gallego"],
  ]) assert.equal(own(link, pid).own, true, `${pid} ← ${link}: ${own(link, pid).reason}`);
  // The politician's own turns in the Congressional Record (speech pipeline).
  assert.equal(own("https://www.govinfo.gov/content/pkg/CREC-2026-01-01/html/x.htm", "chip_roy", "official floor speech (Congressional Record)").own, true);
  // Own-channel video keeps the video pipeline's rules.
  assert.equal(own("https://www.youtube.com/watch?v=x", "chip_roy").kind, "video");
});

await t("Mike Thompson's site is not Bennie Thompson's (the merge)", () => {
  const o = own("https://mikethompson.house.gov/newsroom/press-releases/gun-violence-prevention-task-force-chair-mike-thompson-announces-policy", "bennie_thompson");
  assert.equal(o.own, false); assert.equal(o.kind, "other_member");
  assert.equal(own("https://cammack.house.gov/x", "jim_jordan").kind, "other_member");
  assert.equal(own("https://www.warren.senate.gov/x", "sheehy").own, false);
});

await t("the House Clerk's site is never anyone's evidence", () => {
  const o = own("https://clerk.house.gov/LegalExpenseFund", "susie_lee", "official issue page", ["“Legal Expense Fund Disclosures,” said Rep. Lee."]);
  assert.equal(o.own, false); assert.equal(o.kind, "clerk");
});

await t("White House pages are the President's, not a staff member's", () => {
  for (const pid of ["hassett", "peter_navarro", "stephen_miller"]) {
    const o = own("https://www.whitehouse.gov/issues/", pid, "official issue page");
    assert.equal(o.own, false, pid); assert.equal(o.kind, "white_house", pid);
  }
  assert.equal(own("https://www.whitehouse.gov/issues/", "trump").own, true);
});

await t("committee sites count only when the quote is attributed to the politician", () => {
  for (const [link, pid] of [["https://democrats-homeland.house.gov/news/x", "bennie_thompson"], ["https://budget.house.gov/news/x", "arrington"], ["https://rules.house.gov/x", "jim_mcgovern"], ["https://www.energy.senate.gov/x", "heinrich"]]) {
    const o = own(link, pid, "official press release", ["Securing the Maritime Border: The Future of CBP Air and Marine"]);
    assert.equal(o.own, false, link); assert.equal(o.kind, "committee", link);
  }
  const named = own("https://democrats-homeland.house.gov/news/x", "bennie_thompson", "official press release", ["“We must fund FEMA now,” said Ranking Member Bennie Thompson."]);
  assert.equal(named.own, true); assert.equal(named.kind, "named_speaker");
  // Someone else's quote on the committee site stays out.
  assert.equal(own("https://democrats-homeland.house.gov/news/x", "bennie_thompson", "official press release", ["“We must fund FEMA now,” said Rep. Dan Goldman."]).own, false);
});

await t("agency and other third-party pages are refused; legislature pages only when they are the member's", () => {
  assert.equal(own("https://www.cms.gov/newsroom/x", "mehmet_oz").kind, "agency");
  assert.equal(own("https://www.americansforprosperity.org/x", "nik_anderson").own, false);
  assert.equal(own("https://www.palegis.us/legislation/bills/2025/hb639", "jay_costa", "official issue page").kind, "legislature_other");
  assert.equal(own("https://legislature.vermont.gov/people/single/2026/37410", "vyhovsky_vt", "official state legislature member page").own, true);
});

await t("the Locker writer refuses a page that is not the politician's own", () => {
  const body = "<html><body><h1>Border</h1><p>I will secure the border and fund Border Patrol.</p></body></html>";
  const raw = (url) => ({ url, final_url: url, fetched_at: "2026-11-20T00:00:00Z", source_type: "official press release", politician_id: "bennie_thompson", topic: "border_security", http_status: 200, body });
  const foreign = raw("https://mikethompson.house.gov/newsroom/press-releases/x");
  const c = S.scoreRawRecord(foreign);
  const d = EL.lockerDecision(c, foreign);
  assert.equal(d.write, false); assert.match(d.reason, /not the politician's own page/);
  const mine = raw("https://benniethompson.house.gov/media/press-releases/x");
  assert.equal(EL.lockerDecision(S.scoreRawRecord(mine), mine).write, true);
});

const item = (n, link, excerpt, topic = "veterans", extra = {}) => ({ key: `todd_young/${topic}/${n}.json`, review: null, doc: {
  politician_id: "todd_young", topic, position: "support", confidence: 0.85, strength: "strong", source_type: "official press release",
  link, excerpt, date: "2026-11-01", attribution: "Source: official Senate page", rules_version: "phase9-v1", ...extra } });

await t("a heading on 3+ article pages of one site is a site menu: every copy is dropped", () => {
  const rows = [1, 2, 3, 4, 5].map((n) => item(n, `https://www.young.senate.gov/newsroom/press-releases/r${n}`, "Help for Veterans"));
  rows.push(item(9, "https://www.young.senate.gov/newsroom/press-releases/r9", "I will keep fighting to cut the VA disability backlog for Hoosier veterans."));
  const o = EL.ownEvidenceRows(rows);
  assert.equal(o.dropped.menu, 5); assert.equal(o.kept.length, 1);
  assert.match(o.reasons["todd_young/veterans/1.json"], /site menu/);
});

await t("listing pages do not count toward the menu test; a full sentence needs 6+ pages", () => {
  const S1 = "I will keep fighting to cut the VA disability backlog for every Hoosier veteran and family.";
  const lead = [item(1, "https://www.young.senate.gov/newsroom/press-releases/r1", S1), item(2, "https://www.young.senate.gov/newsroom/press-releases", S1), item(3, "https://www.young.senate.gov/", S1)];
  const a = EL.ownEvidenceRows(lead);
  assert.equal(a.dropped.menu, 0, "one article + two listing pages is not a menu"); assert.equal(a.kept.length, 1, "and counts once");
  const five = [1, 2, 3, 4, 5].map((n) => item(n, `https://www.young.senate.gov/newsroom/press-releases/r${n}`, S1));
  const b = EL.ownEvidenceRows(five);
  assert.equal(b.dropped.menu, 0); assert.equal(b.dropped.repeated, 4); assert.equal(b.kept.length, 1);
  const six = [1, 2, 3, 4, 5, 6].map((n) => item(n, `https://www.young.senate.gov/newsroom/press-releases/r${n}`, S1));
  assert.equal(EL.ownEvidenceRows(six).dropped.menu, 6);
});

await t("the same sentence on several pages counts once toward Steady", () => {
  const S1 = "I support expanding the PACT Act to every veteran exposed to burn pits overseas.";
  const rows = [item(1, "https://www.young.senate.gov/r/a", S1), item(2, "https://www.young.senate.gov/r/b", S1)];
  const before = SP.stanceConsistency(rows.map((r) => EL.toSpotlightEntry(r.doc, { key: r.key })));
  assert.equal(before.label, "steady", "two copies used to read Steady");
  const kept = EL.ownEvidenceRows(rows).kept;
  const after = SP.stanceConsistency(kept.map((r) => EL.toSpotlightEntry(r.doc, { key: r.key })));
  assert.equal(after.label, "thin"); assert.equal(after.items, 1);
  const two = [item(1, "https://www.young.senate.gov/r/a", S1), item(2, "https://www.young.senate.gov/r/b", "We passed the PACT Act so burn-pit veterans finally get the care they earned.")];
  assert.equal(SP.stanceConsistency(EL.ownEvidenceRows(two).kept.map((r) => EL.toSpotlightEntry(r.doc, { key: r.key }))).label, "steady", "two different statements stay Steady");
});

await t("an editor-reviewed item is never dropped by these filters", () => {
  const r = { ...item(1, "https://clerk.house.gov/x", "Legal Expense Fund Disclosures"), review: { status: "reviewed" } };
  assert.equal(EL.ownEvidenceRows([r]).kept.length, 1);
});

await t("promotion reads only own, de-duplicated evidence (lockerEntriesFor)", async () => {
  const data = new Map();
  const put = (r) => data.set(r.key, r.doc);
  put({ key: "bennie_thompson/gun_safety/a.json", doc: { ...item(0, "https://mikethompson.house.gov/newsroom/press-releases/x", "We must pass universal background checks.").doc, politician_id: "bennie_thompson", topic: "gun_safety" } });
  const store = { async list({ prefix = "" } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }, async get(k) { return data.get(k) ?? null; } };
  const ents = await SP.lockerEntriesFor(store, "bennie_thompson");
  assert.equal(ents.length, 0);
  assert.deepEqual(SP.promoteEntries(ents), {});
});

await t("the re-score pass retires foreign-page items to the retired store (any rules version)", async () => {
  const mk = () => { const d = new Map(); return { d,
    async list(o = {}) { if (o.directories) return { directories: [...new Set([...d.keys()].map((k) => k.split("/")[0] + "/"))] }; return { blobs: [...d.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }; },
    async get(k) { return d.has(k) ? JSON.parse(JSON.stringify(d.get(k))) : null; },
    async setJSON(k, v) { d.set(k, JSON.parse(JSON.stringify(v))); }, async delete(k) { d.delete(k); } }; };
  const locker = mk(), retired = mk(), rawStore = mk();
  const bad = { ...item(0, "https://clerk.house.gov/LegalExpenseFund", "Legal Expense Fund Disclosures").doc, politician_id: "susie_lee", topic: "gov_transparency", rules_version: S.RULES_VERSION };
  locker.d.set("susie_lee/gov_transparency/x.json", bad);
  const synced = [];
  const st = await RS.rescoreStep(null, { lockerStore: locker, rawStore, retiredStore: retired, budgetMs: 5000, log: () => {}, sync: async (pid) => synced.push(pid) });
  assert.equal(locker.d.size, 0); assert.equal(retired.d.size, 1);
  assert.match(retired.d.get("susie_lee/gov_transparency/x.json").retired.reason, /clerk/);
  assert.equal(st.tallies.ownership.retired.strong, 1);
  assert.deepEqual(synced, ["susie_lee"], "the politician's stances are recomputed");
  assert.equal(RS.RESCORE_VERSION, "locker-rescore-v2");
});

await t("ground-truth file is untouched and the scorer rules version is unchanged", () => {
  const gt = readFileSync(path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json"));
  assert.ok(createHash("sha256").update(gt).digest("hex").length === 64);
  assert.equal(S.RULES_VERSION, "phase9-v3");
});

console.log(fails.length ? `\n✗ locker-own-v1: ${pass} passed, ${fails.length} failed` : `\n✓ locker-own-v1: ${pass} passed, 0 failed`);
process.exit(fails.length ? 1 : 0);
