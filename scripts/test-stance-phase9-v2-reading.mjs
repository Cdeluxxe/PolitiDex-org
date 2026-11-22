// Phase 9 v2 (rules phase9-v2, R18): reading fixes before a read can promote.
//
// The sentences below are the ones behind live cards that read wrong under
// phase9-v1 (Gillibrand Social Security, Tuberville pro-life, Sanders AI,
// Baldwin and Risch defense, Moulton deportations, Cassidy climate).
//   node scripts/test-stance-phase9-v2-reading.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";
import * as L from "../netlify/lib/evidence-locker-core.mjs";
import * as SP from "../netlify/lib/stated-positions-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATHS = fs.readdirSync(path.join(root, "db")).filter((f) => /^stance-ground-truth-.*\.json$/.test(f)).map((f) => path.join(root, "db", f));
const gtBefore = GT_PATHS.map((p) => fs.readFileSync(p, "utf8"));
let failed = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n     ${String(e?.message || e).split("\n").join("\n     ")}`); }
};
const page = (pid, topic, body, over = {}) => ({
  url: `https://example.gov/${pid}/${topic}`, final_url: `https://example.gov/${pid}/${topic}`, fetched_at: "2026-11-20T10:00:00.000Z",
  source_type: "official press release", politician_id: pid, topic, http_status: 200, body, ...over,
});
const read = (text, topic, pid) => S.classify(text, topic, pid);
const sided = (c) => (c.kind === "clear" || c.kind === "implication" ? c.side : null);

console.log("phase9-v2: reading rules (R18)");

await t("rules version is phase9-v2", () => assert.equal(S.RULES_VERSION, "phase9-v2"));

// ── (a) Polarity ──
await t("polarity: 'We write to denounce … cuts to Social Security' is support, not oppose (Gillibrand)", () => {
  const c = read("We write to denounce the incessant havoc sparked by the Trump Administration’s continual cuts to the Social Security Administration (SSA).", "social_security", "gillibrand");
  assert.equal(sided(c), "support");
  assert.equal(c.framing, "counter");
});
await t("polarity: 'Opposing cuts to Social Security / Medicare' and 'We must stop cuts to Medicare' are support", () => {
  assert.equal(sided(read("Opposing cuts to Social Security and Medicare.", "social_security", "gillibrand")), "support");
  assert.equal(sided(read("We must stop cuts to Medicare.", "social_security", "x")), "support");
  assert.equal(sided(read("We oppose Trump’s plan, which would cut Social Security.", "social_security", "x")), "support");
});
await t("polarity: someone else's cuts named as a noun are a description, never the speaker opposing the program", () => {
  for (const x of ["The bill imposes deep cuts to Medicaid, food assistance, and rural hospitals.", "Drastic cuts to Social Security are devastating for families."]) {
    const c = read(x, "social_security", "x");
    assert.notEqual(sided(c), "oppose", x);
  }
});
await t("polarity: 'never stop fighting to protect' is a promise, not a negation", () => {
  assert.equal(sided(read("I will never stop fighting to protect Social Security.", "social_security", "x")), "support");
});
await t("polarity: protecting abortion rights / rescinding an abortion ban keep their direction on pro_life", () => {
  assert.equal(sided(read("Protecting abortion rights and rescinding the abortion ban.", "pro_life", "x")), "oppose");
  assert.equal(sided(read("I will fight to protect a woman's right to choose.", "pro_choice", "x")), "support");
});
await t("polarity: 'sounding the alarm about the Pentagon’s practice of using taxpayer dollars to fund abortions' is pro-life (Tuberville)", () => {
  const c = read("“For the past two years, I have been sounding the alarm about the Pentagon’s illegal and immoral practice of using taxpayer dollars to fund abortions.", "pro_life", "tommy_tuberville");
  assert.equal(sided(c), "support");
});
await t("polarity: a verb whose object only follows 'about / over' is not acting on it (Tuberville, Cassidy, Moulton, Baldwin)", () => {
  for (const [x, topic, pid] of [
    ["WASHINGTON – Today, U.S. Senator Tommy Tuberville (R-AL) delivered remarks on the Senate floor about the Pentagon’s illegal taxpayer-funding of abortion.", "pro_life", "tommy_tuberville"],
    ["Fights over climate policy should be fought at the ballot box and in Congress, not by financial regulators.", "climate_action", "cassidy"],
    ["The letter raises concerns about reports of inhumane conditions during deportation flights, including prolonged restraints.", "deportations", "seth_moulton"],
    ["WATCH: Baldwin Delivers Remarks on Unauthorized Military Conflict in Venezuela", "strong_defense", "tammy_baldwin"],
  ]) assert.equal(sided(read(x, topic, pid)), null, x);
});
await t("polarity: a modal opening a new predicate, 'rather than', a noun use and 'stop X from …ing' are not the politician acting", () => {
  for (const [x, topic, pid] of [
    ["The Obama Administration determined that banning the pipeline would increase greenhouse gas emissions as trains move the same oil.", "climate_action", "cassidy"],
    ["ICE’s thugs are an embarrassment to America and to the members of our law enforcement who do the hard work of keeping Americans safe every day, rather than murder us like ICE did in Minneapolis.", "deportations", "seth_moulton"],
    ["Senator Baldwin also co-sponsors the Prohibiting Unauthorized Military Action in Venezuela Act of 2025 , which would prohibit the use of federal funds for any use of military force in or against Venezuela", "strong_defense", "tammy_baldwin"],
  ]) assert.equal(sided(read(x, topic, pid)), null, x);
  // …but a relative clause describing the object, and "supports full funding for …", still read.
  assert.equal(sided(read("“I’m proud to support to the First Step Act, an important bill that will advance criminal justice reform.", "justice_reform", "nadler")), "support");
  assert.equal(sided(read("Bethany supports full and equal funding for public education, with the resources students need.", "public_schools", "bethany_mann")), "support");
});

// ── (b) Headlines ──
await t("headlines: Title Case / ALL CAPS / gerund-led lines are headings; imperative planks and sentences are not", () => {
  for (const x of ["Supporting Idaho Agriculture", "Maintaining Peace through Strength", "Securing our Southern Border & Communities", "PROTECTING ELECTION INTEGRITY", "Walker Fights For Affordable Housing"]) assert.ok(S.isHeadlineLike(x), x);
  for (const x of ["Cut Taxes for Families and Businesses", "INVEST IN CLEAN ENERGY", "5) Fast-Track Permits for U.S. Innovation Projects", "Lower Your Electricity Bill.", "We all want secure borders.",
    "As part of National Police Week, Congressman Mackenzie is co-sponsoring multiple pieces of bipartisan legislation focused on strengthening law enforcement, including:"]) assert.ok(!S.isHeadlineLike(x), x);
});
await t("headlines: a site-menu heading on an issue page is not a stance; the page's own headline is, and is marked a headline (Risch)", () => {
  const raw = page("risch", "strong_defense", "<nav><ul><li>Maintaining Peace through Strength</li><li>Supporting Idaho Agriculture</li></ul></nav><h1>Risch Introduces Bill to Lower Cost of Housing</h1><p>The bill would expand supply.</p>");
  const c = S.scoreRawRecord(raw);
  assert.equal(c.position, "no clear position");
  assert.equal(c.sources[0].statements.find((s) => s.text === "Maintaining Peace through Strength").framing, "headline_like");
  const h = S.scoreRawRecord(page("risch", "cost_living", "<h1>Risch Introduces Bill to Lower Cost of Housing</h1><p>The bill would expand supply.</p>", { title: "Risch Introduces Bill to Lower Cost of Housing | Senator Jim Risch" }));
  assert.equal(h.position, "support");
  assert.equal(h.sources[0].excerpt_kind, "headline");
});
await t("headlines: a headline excerpt reaches the card labelled 'Headline', not 'They said'", () => {
  const raw = page("risch", "cost_living", "<h1>Risch Introduces Bill to Lower Cost of Housing</h1><p>The bill would expand supply.</p>", { title: "Risch Introduces Bill to Lower Cost of Housing | Senator Jim Risch", url: "https://www.risch.senate.gov/x", final_url: "https://www.risch.senate.gov/x" });
  const c = S.scoreRawRecord(raw);
  const item = L.buildLockerItem(c, raw, "strong");
  assert.equal(item.excerpt_kind, "headline");
  const e = L.toSpotlightEntry(item, { key: "risch/cost_living/x.json" });
  const p = SP.promoteIssue([e]);
  assert.equal(p.textKind, "headline");
  const card = SP.toCard({ ...p, issueKey: "cost_living", status: "active" });
  assert.equal(card.saidLabel, "Headline");
  assert.equal(card.textKind, "headline");
  const plain = SP.toCard({ ...p, textKind: null, issueKey: "cost_living", status: "active" });
  assert.equal(plain.saidLabel, undefined);
});

// ── (c) Other voices ──
await t("other voices: a committee release whose dateline names Shaheen is not a Risch stance; Risch by name still is", () => {
  const raw = page("risch", "israel_support", "<h1>Shaheen Statement on Joint Resolutions of Disapproval</h1>"
    + "<p>WASHINGTON – Today, U.S. Senator Jeanne Shaheen (D-NH), Ranking Member of the Senate Foreign Relations Committee, issued a statement after voting for the joint resolutions of disapproval.</p>"
    + "<p>We must stop offensive weapons sales to the Netanyahu government.</p>",
    { url: "https://www.foreign.senate.gov/press/dem/release/x", final_url: "https://www.foreign.senate.gov/press/dem/release/x" });
  assert.ok(S.otherPageVoice(raw, S.extractSentences(raw.body)));
  const c = S.scoreRawRecord(raw);
  assert.ok(c.position !== "support" && c.position !== "oppose", c.position);
  const named = S.scoreRawRecord({ ...raw, topic: "gun_rights", body: raw.body + "<p>Senator Risch has long fought to end the ATF’s illegal gun registry.</p>" }, "gun_rights");
  assert.equal(named.position, "support");
});
await t("other voices: a co-lead's quote in a release is theirs (zero weight); the page's politician's own quote counts", () => {
  const q = S.scoreRawRecord(page("cassidy", "climate_action", "<p>“Sustained investments in hydrogen technologies will reduce pollution and help us meet our climate goals,” said Senator Coons.</p>"));
  assert.equal(q.position, "no clear position");
  assert.equal(q.sources[0].statements[0].framing, "quoted_other");
  const own = S.scoreRawRecord(page("cassidy", "climate_action", "<p>“We will cut carbon emissions across the Gulf,” said Dr. Cassidy.</p>"));
  assert.equal(own.position, "support");
});
await t("other voices: an id with no separate surname still matches the politician's own name (bmoore → Moore)", () => {
  assert.ok(S.namesSelf("Congressman Moore, Senator Lankford Lead Letter", "bmoore"));
  assert.ok(!S.namesSelf("Senator Lankford Leads Letter", "bmoore"));
});

// ── (d) Long lists ──
await t("lists: one provision line from a long list of bills does not set the page's stance", () => {
  const items = ["Increases funding for new oil and gas production research", "Provides grants to rural hospitals", "Extends the farm bill", "Requires a report on port security", "Establishes a veterans task force", "Expands broadband in tribal areas"];
  const raw = page("julie_fedorchak", "energy_production", `<h1>Fedorchak Votes for the Appropriations Package</h1><ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  const c = S.scoreRawRecord(raw);
  const line = c.sources[0].statements.find((s) => s.text.startsWith("Increases funding"));
  assert.ok(!line || line.kind === "mention", JSON.stringify(line));
  // …but when the page's main claim is about the topic, the line stands.
  const about = S.scoreRawRecord({ ...raw, body: raw.body.replace("the Appropriations Package", "Bill to Boost American Oil and Gas Production") });
  assert.equal(about.position, "support");
});
await t("lists: a dated timeline entry (an outlet paraphrase) does not set a stance (Cassidy)", () => {
  const raw = page("cassidy", "energy_production", "<p>February 5, 2022: Cassidy spoke to the Washington Examiner on the importance of leveraging the United States’ domestic oil and gas to displace dirtier competitor fuels to reduce global greenhouse gas emissions.</p><p>March 1, 2022: Cassidy joined a hearing.</p><p>April 2, 2022: Cassidy met with producers.</p>");
  const c = S.scoreAllTopics(raw).find((x) => x.topic === "climate_action");
  assert.ok(!c || (c.position !== "support" && c.position !== "oppose"));
});

// ── (e) Third parties ──
await t("third parties: a 'What They Are Saying' section is outside voices, not the politician", () => {
  const raw = page("gillibrand", "social_security", "<h1>Gillibrand Introduces Bill</h1><p>The bill was introduced today.</p><h2>What They Are Saying:</h2><p>AARP: We will protect Social Security for every senior in America.</p>");
  const c = S.scoreRawRecord(raw);
  const st = c.sources[0].statements.find((s) => s.text.startsWith("AARP"));
  assert.equal(st.kind, "mention");
  assert.equal(st.framing, "third_party_section");
});
await t("third parties: 'according to …' and 'the Obama Administration determined …' are the source speaking", () => {
  assert.equal(sided(read("According to a third-party study, under the new policy, taxpayers would fund 4,100 abortions annually.", "pro_life", "tommy_tuberville")), null);
});

// ── (R14) lead cues ──
await t("lead: 'Introduce Legislation to Ban Artificial Superintelligence' is not support for light AI rules (Sanders)", () => {
  const raw = page("sanders", "tech_innovation", "<h1>NEWS: Sanders, Casar to Introduce Legislation to Ban Artificial Superintelligence and Temporarily Pause Advanced AI Development</h1><p>Artificial intelligence is moving fast.</p>");
  assert.notEqual(S.scoreRawRecord(raw).position, "support");
});
await t("lead: 'a bill to stop X from <doing something>' reads the act being stopped, not 'stop' alone", () => {
  const pg = (topic, h) => page("sanders", topic, `<h1>${h}</h1><p>Seniors depend on Social Security every month.</p>`);
  assert.equal(S.scoreRawRecord(pg("social_security", "Sanders Introduces Bill to Stop the Administration from Cutting Social Security")).position, "support");
  assert.notEqual(S.scoreRawRecord(pg("gov_services", "NEWS: Sanders to Introduce Bill to Stop Trump from Garnishing Social Security Checks of Seniors with Student Debt")).position, "oppose");
});
await t("lead: a street-design bill filed under deportations is no read on deportations (Moulton)", () => {
  const raw = page("seth_moulton", "deportations", "<h1>Congressman Moulton Introduces “Building Safer Streets Act” to Improve Street Design Standards and Make Streets Safer</h1><p>Streets should be safe.</p>");
  assert.equal(S.scoreRawRecord(raw).position, "no clear position");
});
await t("cross-topic: 'We all want secure borders' is not a read on mass deportations", () => {
  const raw = page("seth_moulton", "border_security", "<p>We all want secure borders.</p><p>I support comprehensive immigration reform that safeguards the border.</p>");
  assert.ok(!S.scoreAllTopics(raw).some((c) => c.topic === "deportations" && c.position === "support"));
});

await t("every ground-truth file is unchanged by this pass", () => {
  GT_PATHS.forEach((p, i) => assert.equal(fs.readFileSync(p, "utf8"), gtBefore[i], p));
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passed");
