// Phase 9 (rules phase9-v1): framing fixes, Locker re-score, consistency signal.
//
// The sentences below are the ones behind live cards that read wrong under
// phase8-v4 (social_security "oppose" from opposing cuts, pro_life "support"
// from abortion-rights text, a "v." split, off-topic cross reads).
//   node scripts/test-stance-phase9-framing.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as L from "../netlify/lib/evidence-locker-core.mjs";
import * as SP from "../netlify/lib/stated-positions-core.mjs";
import * as RS from "../netlify/lib/locker-rescore.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATH = path.join(root, "db/stance-ground-truth-talarico-cost-of-living.json");
const gtBefore = fs.readFileSync(GT_PATH, "utf8");
let failed = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n     ${String(e?.message || e).split("\n").join("\n     ")}`); }
};
const page = (pid, topic, body, over = {}) => ({
  url: `https://example.gov/${pid}/${topic}`, final_url: `https://example.gov/${pid}/${topic}`, fetched_at: "2026-11-20T10:00:00.000Z",
  source_type: "official press release", politician_id: pid, topic, http_status: 200, body, ...over,
});
const own = (raw, topic = raw.topic) => S.scoreRawRecord(raw, topic);
const clearOf = (c) => c.sources[0].statements.filter((s) => s.kind === "clear");

console.log("phase9-v1: framing, re-score, consistency");

await t("rules version is phase9-v1", () => assert.equal(S.RULES_VERSION, "phase9-v1"));

// ── Attribution ──
await t("attribution: 'Donald Trump claimed he would not cut Social Security' is not the speaker's position (Waters)", () => {
  const c = S.classify("“Donald Trump claimed he would not cut Social Security.", "social_security", "maxine_waters");
  assert.notEqual(c.kind, "clear");
  assert.equal(c.actor?.kind, "opponent");
});
await t("attribution: a reporter's paraphrase on an in-the-news repost is zero weight (Justice)", () => {
  const raw = page("jim_justice", "social_security", "<p>Justice said he believes Social Security must be protected for every senior.</p><p>He will protect Social Security.</p>",
    { url: "https://www.justice.senate.gov/newsroom/in-the-news/x/", final_url: "https://www.justice.senate.gov/newsroom/in-the-news/x/" });
  const c = own(raw);
  assert.equal(c.position, "no clear position");
  assert.ok(c.sources[0].statements.every((s) => s.weight === 0));
  // …but the politician's own first-person words on their own site still count.
  const op = own({ ...raw, body: "<p>I am fighting to protect Social Security for every senior.</p>" });
  assert.equal(op.position, "support");
});
await t("attribution: a letter's 'your policy / decision' and 'the policy that bans' are the addressee acting (Duckworth)", () => {
  const a = S.classify("Your policy will now ban VA providers from even discussing abortion with their Veteran patients.", "pro_life", "duckworth");
  assert.notEqual(a.kind, "clear");
  const b = S.classify("We led colleagues in calling on the Secretary to immediately rescind the VA’s extreme, cruel new policy that bans the VA from providing abortion counseling.", "pro_life", "duckworth");
  assert.equal(b.kind, "clear");
  assert.equal(b.side, "oppose", "rescinding a ban on abortion care is opposing the pro-life position");
});
await t("attribution: possessive 'our' is never the actor ('they are closing our schools … and cutting taxes for the rich')", () => {
  const c = S.classify("They are closing our schools, gutting our health care, and cutting taxes for the rich.", "cost_living", "james_talarico");
  assert.notEqual(c.kind, "clear");
});

// ── Polarity ──
await t("polarity: 'opposing efforts to cut Social Security' is SUPPORT for Social Security (Vasquez)", () => {
  const c = S.classify("Consistently opposing efforts to cut Social Security, Medicare, and Medicaid and ensuring seniors have access to the benefits they have earned.", "social_security", "gabe_vasquez");
  assert.equal(c.kind, "clear");
  assert.equal(c.side, "support");
  assert.equal(c.framing, "counter");
});
await t("polarity: 'reverse the Administration's cuts to … Medicare' is support, not oppose (Talarico)", () => {
  const c = S.classify("Protect and improve the ACA and reverse the Trump Administration’s dangerous cuts to the ACA enhanced tax credits, Medicare, and Medicaid.", "social_security", "james_talarico");
  assert.ok(c.kind !== "clear" || c.side === "support");
});
await t("polarity: 'slams Trump & Musk mission to dismantle Social Security' implies support (Waters headline)", () => {
  const c = S.classify("Congresswoman Maxine Waters Slams Trump & Musk Mission to Dismantle Social Security", "social_security", "maxine_waters");
  assert.ok(c.kind === "mention" || c.side === "support", JSON.stringify(c));
});
await t("polarity: 'blocking attempts to limit access to … abortion' is NOT pro-life support (Meeks)", () => {
  const c = S.classify("Protecting women’s rights by blocking attempts to limit women’s access to reproductive health care, including abortion.", "pro_life", "meeks");
  assert.ok(c.kind !== "clear" || c.side === "oppose", JSON.stringify(c));
});
await t("polarity: 'the Administration's policy banning abortion counseling' is the policy acting (Blumenthal / Baldwin)", () => {
  const c = S.classify("In the brief, the lawmakers argue the Trump Administration’s 2025 policy banning abortion counseling and abortion care in almost all cases rests on a flawed legal premise.", "pro_life", "blumenthal");
  assert.notEqual(c.kind, "clear");
});
await t("polarity: a negated verb is a mention; a reported figure is a mention (Fleming)", () => {
  assert.equal(S.classify("I would never cut Social Security.", "social_security", "x").kind, "mention");
  assert.equal(S.classify("$23B Annually Cut from Social Security", "social_security", "natalie_fleming").kind, "mention");
});
await t("polarity: a counter-frame never reaches across a clause or over a verb of support", () => {
  // "stop efforts to privatize it, cut mental health wait times" — the second clause is the speaker's own.
  assert.equal(S.counterFrame("He’ll fully fund the VA, stop efforts to privatize it, ", "cut mental health wait times"), null);
  assert.equal(S.counterFrame("We oppose the Republicans and support efforts to ", "protect Medicare"), null);
  assert.ok(S.counterFrame("We will fight to stop the plan to ", "cut Social Security"));
});
await t("counter-frame guards: double negative, bill titles, means clauses and questions (Fulcher, Lankford, Durbin, DeLauro)", () => {
  const f = S.classify("I have voted against every bill that does not uphold the right to life for the unborn.", "pro_life", "russ_fulcher");
  assert.equal(f.side, "support", "against a bill that does NOT uphold X is for X");
  assert.notEqual(S.classify("Lankford offered the Prevent Government Shutdowns Act , as amendments to the defense bill to protect taxpayer dollars.", "strong_defense", "lankford").side, "oppose");
  assert.equal(S.classify("This bill would enhance efforts to prevent domestic terrorism by requiring federal law enforcement agencies to establish offices.", "back_police", "durbin").side, "support");
  assert.equal(S.classify("What more will it take for the VA to stop making this drug available to our veterans?", "veterans", "delauro").kind, "mention");
  assert.equal(S.classify("Defending the Right to Abortion", "pro_choice", "robert_garcia").side, "support", "the right to abortion is on the pro-choice key");
});
await t("polarity: removing a burden on a program supports it ('eliminated the waiting period for Social Security disability benefits', Coons)", () => {
  const c = S.classify("This law eliminated the five-month waiting period for Social Security disability benefits for those with medically-diagnosed ALS.", "social_security", "coons");
  assert.equal(c.side, "support");
});
await t("plain statements are unchanged: 'I will protect Social Security' supports; 'I will cut Social Security' opposes", () => {
  assert.equal(S.classify("I will protect Social Security.", "social_security", "x").side, "support");
  assert.equal(S.classify("I will cut Social Security benefits.", "social_security", "x").side, "oppose");
});

// ── Sentence splitting ──
await t("splitter: 'Roe v. Wade' and 'Dobbs v. Jackson' are one sentence (Warner)", () => {
  const s = S.extractSentences("<p>In 2022, the Supreme Court overturned Roe v. Wade and eliminated the federal constitutional right to abortion in America: this was the Dobbs v. Jackson Women’s Health Organization ruling.</p>");
  assert.equal(s.length, 1, JSON.stringify(s));
  assert.ok(!s.some((x) => /^Wade\b/.test(x)));
  const c = S.classify(s[0], "pro_life", "warner");
  assert.notEqual(c.kind, "clear", "the Court acted, not Warner");
});

// ── Off-topic cross reads ──
await t("cross-topic: 'secure peace in Israel and Palestine' is not support for Israel (Talarico)", () => {
  const c = S.classify("Use every ounce of our diplomatic and financial leverage to secure peace in Israel and Palestine.", "israel_support", "james_talarico");
  assert.notEqual(c.kind, "clear");
  const mixed = S.classify("Protect innocent life by stopping offensive weapons sales to the Netanyahu government while supporting defensive systems like the Iron Dome.", "israel_support", "james_talarico");
  assert.notEqual(mixed.kind, "clear", "a both-ways line is not one side of the umbrella key");
});
await t("cross-topic: one passing line on a long page about something else is not a finding (R17c)", () => {
  const filler = Array.from({ length: 12 }, (_, i) => `<p>We will lower grocery prices for families in county ${i + 1}.</p>`).join("");
  const raw = page("pz", "cost_living", `${filler}<p>I will fully fund our public schools.</p>`);
  assert.ok(!S.scoreAllTopics(raw).some((c) => c.topic === "public_schools"));
  const twice = page("pz", "cost_living", `${filler}<p>I will fully fund our public schools.</p><p>We must raise teacher pay in our public schools.</p>`);
  assert.ok(S.scoreAllTopics(twice).some((c) => c.topic === "public_schools"), "a page that addresses the topic twice still yields it");
  const short = page("pz", "cost_living", "<p>I will lower costs.</p><p>I will fully fund our public schools.</p>");
  assert.ok(S.scoreAllTopics(short).some((c) => c.topic === "public_schools"), "a short page is all claims");
});

// ── Locker: re-score and W6 ──
const cand = (over = {}) => ({
  politician_id: "pq", topic: "social_security", position: "support", confidence: 0.85, confidence_reason: "r", rules_version: S.RULES_VERSION,
  sources: [{ link: "https://pq.house.gov/a", type: "official press release", excerpt: "I will protect Social Security.", statements: [{ kind: "clear", side: "support", text: "I will protect Social Security." }] }],
  ...over,
});
const memStore = () => {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async setJSON(k, v, o = {}) { if (o.onlyIfNew && m.has(k)) return { modified: false }; m.set(k, JSON.stringify(v)); return { modified: true }; },
    async delete(k) { m.delete(k); },
    async list({ prefix = "", directories = false } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix));
      if (directories) return { blobs: [], directories: [...new Set(keys.map((k) => k.split("/")[0]))] };
      return { blobs: keys.map((key) => ({ key })) };
    },
  };
};
const rawRec = { url: "https://pq.house.gov/a", final_url: "https://pq.house.gov/a", fetched_at: "2026-11-20T10:00:00Z", source_type: "official press release", politician_id: "pq", topic: "social_security", http_status: 200, body: "<p>I will protect Social Security.</p>" };

await t("W4: a strong item under OLDER rules is replaced by today's read, and keeps the read it replaced", async () => {
  const store = memStore();
  const key = L.lockerKey({ politician_id: "pq", topic: "social_security", link: "https://pq.house.gov/a" });
  await store.setJSON(key, { politician_id: "pq", topic: "social_security", position: "oppose", confidence: 0.8, strength: "strong", link: "https://pq.house.gov/a", rules_version: "phase8-v4", excerpt: "old" });
  const w = await L.maybeWriteLockerItem(cand(), rawRec, { store, log: () => {} });
  assert.equal(w.written, true);
  const now = await store.get(key);
  assert.equal(now.position, "support");
  assert.equal(now.rules_version, "phase9-v1");
  assert.equal(now.rescored.from.position, "oppose");
  // Under the SAME rules a strong item is still never overwritten.
  const again = await L.maybeWriteLockerItem(cand({ confidence: 0.9 }), rawRec, { store, log: () => {} });
  assert.equal(again.written, false);
});
await t("W6: a STRONG cross-topic read on the other side is kept (evidence on both sides is not suppressed)", async () => {
  const store = memStore();
  await store.setJSON("pq/social_security/held.json", { politician_id: "pq", topic: "social_security", position: "oppose", confidence: 0.9, link: "https://pq.house.gov/b" });
  const strong = cand({ page_topic: "healthcare_costs" });
  assert.equal(await L.heldConflict(strong, "pq/social_security/new.json", { store }), null);
  const weak = cand({ page_topic: "healthcare_costs", confidence: 0.6 });
  assert.ok(await L.heldConflict(weak, "pq/social_security/new.json", { store }), "a weak cross-topic read is still held");
});
await t("statement dates come only from dated documents, never from living issue pages", () => {
  const rel = { source_type: "official press release", url: "https://x.gov/2024/05/12/a", body: '<meta property="article:published_time" content="2024-05-12T09:00:00Z">' };
  assert.equal(L.statementDateOf(rel), "2024-05-12");
  assert.equal(L.statementDateOf({ ...rel, source_type: "campaign issue page" }), null);
});
await t("re-score: an item whose page now reads the other way is rewritten; a page that no longer addresses the topic retires it", () => {
  const doc = { politician_id: "pq", topic: "social_security", position: "oppose", confidence: 0.8, strength: "strong", link: "https://pq.house.gov/a", rules_version: "phase8-v4", source_type: "official press release" };
  const raw = { ...rawRec, body: "<p>I am proud to keep opposing efforts to cut Social Security for every senior in our district.</p>" };
  const r = RS.rescoreItem(doc, raw);
  assert.equal(r.action, "rewrite");
  assert.equal(r.next.position, "support");
  assert.equal(RS.changeKind(r), "flipped");
  const gone = RS.rescoreItem({ ...doc, topic: "public_schools", page_topic: "social_security" }, raw);
  assert.equal(gone.action, "retire");
});
await t("re-score skips flagged, current, mention and video items", () => {
  const base = { politician_id: "pq", topic: "housing", position: "support", confidence: 0.9, link: "https://a", rules_version: "phase8-v4" };
  assert.equal(RS.skipReason(base, "k"), null);
  assert.equal(RS.skipReason({ ...base, rules_version: S.RULES_VERSION }, "k"), "current");
  assert.equal(RS.skipReason({ ...base, position: "no clear position", confidence: 0.3, excerpt: "x" }, "k"), "mention");
  assert.equal(RS.skipReason({ ...base, link: "https://www.youtube.com/watch?v=1" }, "k"), "video");
  assert.equal(RS.skipReason({ ...base, review: { status: "reviewed" } }, "k"), "flagged");
});
await t("re-score step: dry run writes nothing; a real run rewrites, retires and recomputes the politician", async () => {
  const locker = memStore(), raws = memStore(), retired = memStore();
  const k1 = "pq/social_security/h1.json", k2 = "pq/public_schools/h1.json";
  const docBase = { politician_id: "pq", confidence: 0.8, strength: "strong", link: "https://pq.house.gov/a", rules_version: "phase8-v4", source_type: "official press release", source_id: "s1" };
  await locker.setJSON(k1, { ...docBase, topic: "social_security", position: "oppose" });
  await locker.setJSON(k2, { ...docBase, topic: "public_schools", page_topic: "social_security", position: "support" });
  await raws.setJSON("pq/social_security/s1/2026-11-20T10-00-00Z.json", { ...rawRec, source_id: "s1", body: "<p>I am proud to keep opposing efforts to cut Social Security for every senior in our district.</p>" });
  const before = JSON.stringify([...locker.m]);
  const dry = await RS.rescoreStep(null, { lockerStore: locker, rawStore: raws, dry: true, log: () => {} });
  assert.equal(JSON.stringify([...locker.m]), before, "dry run leaves the Locker untouched");
  assert.equal(dry.tallies.outcomes.strong.flipped, 1);
  assert.equal(dry.tallies.outcomes.strong.retired, 1);
  const synced = [];
  const real = await RS.rescoreStep(null, { lockerStore: locker, rawStore: raws, retiredStore: retired, log: () => {}, sync: async (pid) => synced.push(pid) });
  assert.equal(real.complete, true);
  assert.equal((await locker.get(k1)).position, "support");
  assert.equal(await locker.get(k2), null);
  assert.ok((await retired.get(k2)).retired.reason);
  assert.deepEqual(synced, ["pq"]);
  const again = await RS.rescoreStep(real, { lockerStore: locker, rawStore: raws, log: () => {} });
  assert.equal(again.tallies.examined, real.tallies.examined, "a complete pass does nothing more");
});

// ── Consistency ──
const entry = (position, confidence, url, extra = {}) => ({
  issueKey: "housing", source: { url, label: "Source" },
  pipeline: { position, confidence, excerpt: `x ${url}`, captured: "2026-11-10", key: `p/housing/${url.slice(-3)}.json`, ...extra },
});
await t("consistency: Steady = 2+ strong items, all the same side", () => {
  const c = SP.stanceConsistency([entry("support", 0.9, "https://a/001"), entry("support", 0.85, "https://a/002"), entry("support", 0.5, "https://a/003")]);
  assert.equal(c.label, "steady");
  assert.deepEqual([c.same, c.items, c.side], [3, 3, "support"]);
});
await t("consistency: Mixed = strong on both sides, or a change over time", () => {
  assert.equal(SP.stanceConsistency([entry("support", 0.9, "https://a/001"), entry("oppose", 0.9, "https://a/002")]).label, "mixed");
  const shift = SP.stanceConsistency([
    entry("support", 0.6, "https://a/001", { stated_date: "2019-03-01" }), entry("support", 0.6, "https://a/002", { stated_date: "2020-01-01" }),
    entry("oppose", 0.9, "https://a/003", { stated_date: "2024-06-01" }), entry("oppose", 0.9, "https://a/004", { stated_date: "2025-02-01" }),
  ]);
  assert.equal(shift.label, "mixed");
  assert.deepEqual(shift.shift, { from: "support", to: "oppose", until: "2020-01-01", since: "2024-06-01" });
});
await t("consistency: one stray item against many is Steady with the count shown, and the card keeps the majority side", () => {
  const es = [...Array.from({ length: 9 }, (_, i) => entry("support", 0.85, `https://a/1${String(i).padStart(2, "0")}`)), entry("oppose", 0.9, "https://a/200")];
  const c = SP.stanceConsistency(es);
  assert.equal(c.label, "steady");
  assert.deepEqual([c.same, c.items], [9, 10]);
  assert.equal(SP.promoteIssue(es).stance, "support");
  const one = SP.stanceConsistency([entry("support", 0.9, "https://a/001", { stated_date: "2020-01-01" }), entry("oppose", 0.9, "https://a/002", { stated_date: "2024-01-01" }), entry("oppose", 0.9, "https://a/003")]);
  assert.ok(!one.shift, "one dated item each way is not a shift");
});
await t("consistency: Thin = one or two items, or only weak evidence", () => {
  assert.equal(SP.stanceConsistency([entry("support", 0.9, "https://a/001")]).label, "thin");
  assert.equal(SP.stanceConsistency([entry("support", 0.5, "https://a/001"), entry("support", 0.5, "https://a/002"), entry("support", 0.5, "https://a/003")]).label, "thin");
  assert.equal(SP.stanceConsistency([entry("support", 0.2, "https://a/001")]), null, "mentions never count");
});
await t("consistency rides on the promoted record and the served card; a both-sides issue promotes Mixed", () => {
  const p = SP.promoteIssue([entry("support", 0.9, "https://a/001"), entry("oppose", 0.9, "https://a/002")]);
  assert.equal(p.stance, "mixed");
  assert.equal(p.consistency.label, "mixed");
  const card = SP.toCard({ issueKey: "housing", stance: "mixed", text: "t", sourceUrl: "https://a/001", consistency: p.consistency, evidence: p.evidence });
  assert.equal(card.pipeline.consistency.label, "mixed");
});
await t("the card quotes a page filed under the issue before a cross-topic read of another page", () => {
  const p = SP.promoteIssue([
    entry("support", 0.85, "https://jamestalarico.com/issue/health-care/", { page_topic: "healthcare_costs" }),
    entry("support", 0.85, "https://jamestalarico.com/issue/energy-environment/"),
    entry("support", 0.85, "https://jamestalarico.com/issue/taxes-cost-of-living/"),
  ].map((e) => ({ ...e, issueKey: "cost_living" })));
  assert.equal(p.sourceUrl, "https://jamestalarico.com/issue/taxes-cost-of-living/");
});

// ── Ground truth ──
await t("ground truth: the file is unchanged and Talarico cost_living still reads support 0.85", () => {
  assert.equal(fs.readFileSync(GT_PATH, "utf8"), gtBefore);
  const gt = JSON.parse(gtBefore);
  assert.equal(gt.position, "support");
  assert.equal(gt.confidence, 0.85);
});

console.log(failed ? `${failed} failing` : "phase9-v1: all checks pass");
process.exit(failed ? 1 : 0);
