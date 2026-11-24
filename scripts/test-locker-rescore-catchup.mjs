// Locker re-score catch-up (phase9-v2-gap-1) — the first phase9-v2 pass resumed
// mid-politician by POSITION, so groups re-scored on one run dropped out of the
// list and the stored index skipped groups nobody had handled; the cursor was
// then marked complete. This suite checks that:
//   · a stored phase9-v2 cursor without the catch-up mark is not trusted: every
//     remaining old-rule strong/weak non-video item is re-scored or retired;
//   · resuming inside a politician is by group KEY, so nothing is skipped;
//   · every politician visited (and every one holding a live card) has their
//     promotion recomputed: non-qualifying cards are withdrawn, cards whose best
//     evidence changed quote the new text with the new side/strength, and cards
//     that still qualify are left alone;
//   · own-channel videos stay out of the re-score;
//   · once the catch-up completes, later passes behave as before.
// The scorer has since moved to phase9-v3 (polarity, R19). The catch-up stays
// pinned to phase9-v2, so a stored phase9-v2 cursor — complete or still in the
// catch-up — gives way to an ordinary fresh phase9-v3 pass that re-scores every
// older-rule item and recomputes the politicians it touches.
import assert from "node:assert/strict";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as SP from "../netlify/lib/stated-positions-core.mjs";
import * as RS from "../netlify/lib/locker-rescore.mjs";

let failed = 0, passed = 0;
const t = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n     ${String(e?.stack || e).split("\n").slice(0, 4).join("\n     ")}`); }
};

const memStore = ({ delayMs = 0 } = {}) => {
  const m = new Map();
  const wait = () => (delayMs ? new Promise((r) => setTimeout(r, delayMs)) : null);
  return {
    m,
    async get(k) { await wait(); return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); return { modified: true }; },
    async delete(k) { m.delete(k); },
    async list({ prefix = "", directories = false } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix));
      if (directories) return { directories: [...new Set(keys.map((k) => k.split("/")[0] + "/"))] };
      return { blobs: keys.map((key) => ({ key })) };
    },
  };
};
// An in-memory pdx_stated_positions with the production adapter's surface.
const memDb = () => {
  const rows = new Map(); // `${pid}|${key}` → row
  const calls = { upsert: [], withdraw: [] };
  return {
    rows, calls,
    async rowsFor(pid) { return [...rows.values()].filter((r) => r.politicianId === pid).map((r) => ({ ...r })); },
    async upsert(pid, rec, at) {
      calls.upsert.push(`${pid}|${rec.issueKey}`);
      const { issueKey, ...rest } = rec;
      rows.set(`${pid}|${issueKey}`, { ...rest, politicianId: pid, issueKey, status: "active", provenance: SP.PROVENANCE, updatedAt: at });
    },
    async withdraw(pid, keys, at) {
      for (const k of keys) { calls.withdraw.push(`${pid}|${k}`); const r = rows.get(`${pid}|${k}`); if (r) rows.set(`${pid}|${k}`, { ...r, status: "withdrawn", updatedAt: at }); }
    },
    async activePoliticians() { return [...new Set([...rows.values()].filter((r) => r.status === "active" && r.provenance === SP.PROVENANCE).map((r) => r.politicianId))]; },
  };
};

const OLD = "phase8-v4";
const FLIP_BODY = "<p>I am proud to keep opposing efforts to cut Social Security for every senior in our district.</p>";
const rawFor = (pid, sid, body = FLIP_BODY) => ({
  url: `https://${pid}.house.gov/${sid}`, final_url: `https://${pid}.house.gov/${sid}`, fetched_at: "2026-11-20T10:00:00Z",
  source_type: "official press release", politician_id: pid, topic: "social_security", http_status: 200, source_id: sid, body,
});
const lockerDoc = (pid, sid, over = {}) => ({
  politician_id: pid, topic: "social_security", position: "oppose", confidence: 0.9, strength: "strong",
  link: `https://${pid}.house.gov/${sid}`, rules_version: OLD, source_type: "official press release", source_id: sid,
  excerpt: "Old read of the page.", attribution: "official press release", date: "2026-11-01", ...over,
});
// The cursor the first phase9-v2 pass left behind: complete, no catch-up mark.
const legacyCompleteState = () => {
  const s = RS.freshState("phase9-v2");
  delete s.catch_up; delete s.page_after;
  return { ...s, pid_index: 99, page_index: 0, complete: true, summary: "locker-rescore: COMPLETE" };
};
const syncer = (locker, db) => async (pid) => { const r = await SP.syncPolitician(pid, await SP.lockerEntriesFor(locker, pid), { db, log: () => {} }); if (r.error) throw new Error(r.error); };
const runToCompletion = async (state, deps, max = 200) => {
  let st = state;
  for (let i = 0; i < max; i++) { st = await RS.rescoreStep(st, deps); if (st.complete) return { st, runs: i + 1 }; }
  throw new Error("pass did not complete");
};

console.log("locker re-score catch-up (phase9-v2-gap-1)");

await t("the scorer is at phase9-v3; the re-score version is unchanged and the catch-up stays pinned to phase9-v2", () => {
  assert.equal(S.RULES_VERSION, "phase9-v3");
  assert.equal(RS.RESCORE_VERSION, "locker-rescore-v2");
  assert.equal(RS.CATCH_UP.rules_version, "phase9-v2");
  assert.ok(RS.freshState("phase9-v2").catch_up, "the catch-up still applies to a phase9-v2 pass");
  assert.equal(RS.freshState().catch_up, null, "a phase9-v3 pass is an ordinary pass");
});

await t("a stored phase9-v2 cursor (complete, no catch-up mark) gives way to a fresh phase9-v3 pass: every old-rule item is re-scored", async () => {
  const locker = memStore(), raws = memStore(), retired = memStore();
  // One high-volume politician: 8 page groups, half already re-scored by the first pass.
  for (let i = 0; i < 8; i++) {
    const sid = `s${i}`;
    await raws.setJSON(`ab/social_security/${sid}/2026-11-20T10-00-00Z.json`, rawFor("ab", sid));
    await locker.setJSON(`ab/social_security/${sid}.json`, lockerDoc("ab", sid, i % 2 ? { rules_version: S.RULES_VERSION, position: "support" } : {}));
  }
  // A weak old-rule item, and an own-channel video that must stay out of the re-score.
  await locker.setJSON("ab/social_security/w.json", lockerDoc("ab", "s0", { confidence: 0.5, strength: "weak", link: "https://ab.house.gov/s0" }));
  const video = lockerDoc("ab", "v1", { link: "https://www.youtube.com/watch?v=abc", source_type: "own YouTube channel video", source_id: "v1" });
  await locker.setJSON("ab/social_security/video.json", video);
  // Under the old cursor the pass is a no-op …
  const legacy = legacyCompleteState();
  const { st } = await runToCompletion(legacy, { lockerStore: locker, rawStore: raws, retiredStore: retired, log: () => {}, budgetMs: 5000 });
  assert.equal(st.rules_version, S.RULES_VERSION);
  assert.equal(st.catch_up, null);
  for (const [k, v] of locker.m) {
    const doc = JSON.parse(v);
    if (k.endsWith("video.json")) { assert.equal(doc.rules_version, OLD, "own-channel video is not re-scored"); continue; }
    assert.equal(doc.rules_version, S.RULES_VERSION, `${k} carries the current rules`);
  }
  assert.equal(st.tallies.skipped.video, 1);
});

await t("resuming inside a politician is by group key, so no unhandled group is skipped (the gap)", async () => {
  // A slow page store makes the budget run out after about one group per run.
  const locker = memStore(), raws = memStore({ delayMs: 25 }), retired = memStore();
  const N = 12;
  for (let i = 0; i < N; i++) {
    const sid = `g${String(i).padStart(2, "0")}`;
    await raws.setJSON(`cd/social_security/${sid}/2026-11-20T10-00-00Z.json`, rawFor("cd", sid));
    await locker.setJSON(`cd/social_security/${sid}.json`, lockerDoc("cd", sid));
  }
  const db = memDb();
  const { st, runs } = await runToCompletion(null, { lockerStore: locker, rawStore: raws, retiredStore: retired, log: () => {}, budgetMs: 10, sync: syncer(locker, db), livePids: () => db.activePoliticians() });
  assert.ok(runs > 2, `the pass was split across runs (${runs})`);
  const left = [...locker.m.values()].map((v) => JSON.parse(v)).filter((d) => d.rules_version !== S.RULES_VERSION);
  assert.equal(left.length, 0, `${left.length} old-rule item(s) skipped`);
  assert.equal(st.tallies.examined, N, "items are counted once even when the politician spans runs");
});

await t("an older cursor stored mid-politician by position resumes at the start of that politician", async () => {
  const locker = memStore(), raws = memStore();
  for (let i = 0; i < 4; i++) {
    const sid = `h${i}`;
    await raws.setJSON(`ef/social_security/${sid}/2026-11-20T10-00-00Z.json`, rawFor("ef", sid));
    await locker.setJSON(`ef/social_security/${sid}.json`, lockerDoc("ef", sid));
  }
  const st0 = { ...RS.freshState(S.RULES_VERSION), page_index: 3 };
  delete st0.page_after;
  const { st } = await runToCompletion(st0, { lockerStore: locker, rawStore: raws, log: () => {}, budgetMs: 5000 });
  assert.ok(st.complete);
  assert.equal([...locker.m.values()].map((v) => JSON.parse(v)).filter((d) => d.rules_version !== S.RULES_VERSION).length, 0);
});

await t("after the re-score every touched politician's cards are recomputed: withdrawn, resynced, or left alone (untouched politicians are not)", async () => {
  const locker = memStore(), raws = memStore(), retired = memStore();
  const db = memDb();
  const at = new Date("2026-11-01T00:00:00Z");
  // gh: an old-rule strong item whose page now reads the other way → card resynced.
  await raws.setJSON("gh/social_security/s1/2026-11-20T10-00-00Z.json", rawFor("gh", "s1"));
  await locker.setJSON("gh/social_security/s1.json", lockerDoc("gh", "s1"));
  // ij: a card on an old-rule item whose page no longer addresses the topic → item retired, card withdrawn.
  await raws.setJSON("ij/social_security/s1/2026-11-20T10-00-00Z.json", rawFor("ij", "s1", "<p>Our office hours are posted here.</p>"));
  await locker.setJSON("ij/social_security/s1.json", lockerDoc("ij", "s1"));
  // kl: already at current rules, still qualifies → card untouched.
  await locker.setJSON("kl/social_security/s1.json", lockerDoc("kl", "s1", { rules_version: S.RULES_VERSION, position: "support", excerpt: "I will protect Social Security." }));
  // mn: a live card on an issue its current Locker no longer supports (drift) → withdrawn.
  await locker.setJSON("mn/social_security/s1.json", lockerDoc("mn", "s1", { rules_version: S.RULES_VERSION, position: "support", excerpt: "I will protect Social Security." }));
  // op: a live card and no Locker items at all → withdrawn.
  // Seed today's cards from the pre-re-score Locker, then add the drifted ones.
  for (const pid of ["gh", "ij", "kl", "mn"]) await SP.syncPolitician(pid, await SP.lockerEntriesFor(locker, pid), { db, now: () => at, log: () => {} });
  const seed = (pid, issueKey) => db.rows.set(`${pid}|${issueKey}`, { politicianId: pid, issueKey, stance: "support", strength: "strong", text: "stale", status: "active", provenance: SP.PROVENANCE, evidence: [`${pid}/${issueKey}/gone.json`], strongCount: 1, weakCount: 0, updatedAt: at });
  seed("mn", "housing");
  seed("op", "housing");
  // A curated row is never touched.
  db.rows.set("op|gun_safety", { politicianId: "op", issueKey: "gun_safety", stance: "support", status: "active", provenance: "curated", evidence: [], updatedAt: at });
  const before = { gh: { ...db.rows.get("gh|social_security") }, kl: { ...db.rows.get("kl|social_security") } };
  assert.equal(before.gh.stance, "oppose");
  db.calls.upsert.length = 0; db.calls.withdraw.length = 0;

  const { st } = await runToCompletion(legacyCompleteState(), { lockerStore: locker, rawStore: raws, retiredStore: retired, log: () => {}, budgetMs: 5000, sync: syncer(locker, db), livePids: () => db.activePoliticians() });
  assert.equal(st.rules_version, S.RULES_VERSION);

  const gh = db.rows.get("gh|social_security");
  const ghItem = await locker.get("gh/social_security/s1.json");
  assert.equal(gh.status, "active");
  assert.equal(gh.stance, "support", "the card shows the new side");
  assert.equal(gh.strength, ghItem.strength, "the card shows the new strength");
  assert.equal(gh.rulesVersion, S.RULES_VERSION);
  assert.notEqual(gh.text, before.gh.text);
  assert.ok(gh.text.includes(ghItem.excerpt) || ghItem.excerpt.includes(gh.text) || gh.text === ghItem.excerpt, "the card quotes the new text");
  assert.ok(!/Old read of the page/.test(gh.text));

  assert.equal(await locker.get("ij/social_security/s1.json"), null);
  assert.equal(db.rows.get("ij|social_security").status, "withdrawn");
  // mn and op were not touched by this ordinary pass (no older-rule items), so —
  // unlike the phase9-v2 catch-up — they are not recomputed and keep their rows.
  assert.equal(db.rows.get("mn|housing").status, "active");
  assert.equal(db.rows.get("op|housing").status, "active");
  assert.equal(db.rows.get("op|gun_safety").status, "active", "curated rows are never written");

  assert.equal(db.rows.get("kl|social_security").status, "active");
  assert.ok(!db.calls.upsert.includes("kl|social_security"), "a card that still qualifies is left alone");
  assert.ok(!db.calls.upsert.includes("mn|social_security"));
  assert.deepEqual(db.rows.get("kl|social_security"), before.kl);

  // No live card remains that a fresh recompute from today's Locker would not produce.
  for (const pid of ["gh", "ij", "kl"]) {
    const promo = SP.promoteEntries(await SP.lockerEntriesFor(locker, pid));
    for (const r of await db.rowsFor(pid)) {
      if (r.status !== "active" || r.provenance !== SP.PROVENANCE) continue;
      assert.ok(promo[r.issueKey], `${pid}|${r.issueKey} is live but no longer qualifies`);
      assert.equal(r.stance, promo[r.issueKey].stance);
      assert.equal(r.text, promo[r.issueKey].text);
    }
  }
});

await t("once the catch-up completes, a normal pass recomputes only touched politicians again", async () => {
  const locker = memStore(), raws = memStore();
  await raws.setJSON("qr/social_security/s1/2026-11-20T10-00-00Z.json", rawFor("qr", "s1"));
  await locker.setJSON("qr/social_security/s1.json", lockerDoc("qr", "s1"));
  await locker.setJSON("st/social_security/s1.json", lockerDoc("st", "s1", { rules_version: S.RULES_VERSION }));
  const synced = [];
  const done = { ...RS.freshState(S.RULES_VERSION), catch_up: { id: RS.CATCH_UP.id, recompute_all: false } };
  const st = await RS.rescoreStep(done, { lockerStore: locker, rawStore: raws, log: () => {}, budgetMs: 5000, sync: async (p) => synced.push(p), livePids: async () => ["zz"] });
  assert.ok(st.complete);
  assert.deepEqual(synced, ["qr"], "only the politician whose items were re-scored is recomputed");
  // And a complete pass with the mark is a no-op on the next run.
  const again = await RS.rescoreStep(st, { lockerStore: locker, rawStore: raws, log: () => {}, sync: async (p) => synced.push(p) });
  assert.equal(again, st);
  assert.deepEqual(synced, ["qr"]);
  // A later rules version starts an ordinary fresh pass with no catch-up.
  assert.equal(RS.freshState("phase10-v1").catch_up, null);
});

await t("a dry run of the catch-up writes nothing", async () => {
  const locker = memStore(), raws = memStore();
  await raws.setJSON("uv/social_security/s1/2026-11-20T10-00-00Z.json", rawFor("uv", "s1"));
  await locker.setJSON("uv/social_security/s1.json", lockerDoc("uv", "s1"));
  const before = JSON.stringify([...locker.m]);
  const synced = [];
  await RS.rescoreStep(legacyCompleteState(), { lockerStore: locker, rawStore: raws, dry: true, log: () => {}, sync: async (p) => synced.push(p) });
  assert.equal(JSON.stringify([...locker.m]), before);
  assert.deepEqual(synced, []);
});

console.log(failed ? `\n✗ locker re-score catch-up: ${passed} passed, ${failed} failed` : `\n✓ locker re-score catch-up: ${passed} passed, 0 failed`);
process.exit(failed ? 1 : 0);
