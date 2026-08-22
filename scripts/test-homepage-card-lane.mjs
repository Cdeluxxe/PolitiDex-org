#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The homepage record card publishes the profile's formal record — one figure,
// one lane's vocabulary, one door
// ─────────────────────────────────────────────────────────────────────────────
// A card in the hero and the profile it opens are the same product, and a reader
// who taps one to check the other has to find the same answer waiting. Three ways
// that breaks, all of them invisible from inside either surface alone:
//
//   1. TWO FIGURES. The card prints a percentage the profile does not — a stale
//      memo, a second derivation, a build-time seed. Gated here by reading BOTH
//      out of one warm sandbox and comparing them, for a member and for a
//      president, and again after the derivation epoch moves.
//   2. THE WRONG LANE'S NOUNS. A president has no roll calls, so "14 mapped votes
//      on record" under one is not a wording slip, it is a claim about a record
//      that does not exist. A member has no executive orders, and an inventory of
//      them on a member's card is the same error pointed the other way. Gated by
//      painting the real renderer with real reads and reading the HTML.
//   3. A CONFIDENT NUMBER OVER A COLD CACHE. The figure exists the moment the
//      engine is asked; whether it is PUBLISHABLE is a separate question, and a
//      card that paints the first without the second is the loading ghost. Gated
//      on a cold member — engine loaded, no roll calls fetched.
//
// Plus the standing rules this surface inherits: no party-loyalty language on a
// card face, no second score beside Direction Match, and every judgement word
// tracked back to PDXProfileCard rather than composed in the renderer.
//
//   node scripts/test-homepage-card-lane.mjs
//
// Real modules, real bundled data, one node:vm sandbox. The congressional lane is
// warmed by seeding PDXVotingRecord's cache the way a completed fetch leaves it.
// No database, no network, no browser.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-card.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const RENDERER = R("hero-showcase.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const lacks = (s, sub, m) => ok(!String(s).includes(sub), `${m} — "${sub}" is on the card face`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that stopped offering a case passes silently, so the probes that
// establish one are fatal rather than counted.
const must = (c, m) => { if (!c) { console.error(`✗ homepage card lane: ${m}`); process.exit(1); } };

const MEMBER = "michael_guest";
const PREZ = "trump";

// ── The engine, warm ─────────────────────────────────────────────────────────
function boot(seedVotes) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win._pdxOfficeLine = () => "";
  win._getPhotoUrl = () => "";
  win.PROFILES = undefined;
  for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  if (seedVotes && win.PDXVotingRecord && win.PDXVotingRecord._records) {
    win.PDXVotingRecord._records[MEMBER] = seedVotes;
    if (typeof win.PDXDataChanged === "function") win.PDXDataChanged();
  }
  return win;
}

// Two fabricated roll calls, seeded the way a completed fetch leaves the cache.
// The votes are a fixture; everything they are compared against — the stances, the
// issue map, the weights — is the shipped data.
const vote = (id, issueKey, position, meaning) => ({
  kind: "vote", rollcallId: id, measureId: 900 + id, number: "H.R. " + id,
  date: "2025-04-0" + ((id % 9) + 1), action: "On Passage", position, isProcedural: false,
  title: "Fixture measure " + id,
  source: { url: "https://www.congress.gov/roll-call-vote/" + id, label: "Congress.gov" },
  issues: [{ issueKey, weight: 95, isPrimary: true, supportMeaning: meaning }],
});
// Seeded on issues this member has actually stated a position on — an untestable
// vote proves nothing about a card that only prints tested ones.
const WARM_VOTES = [
  vote(1, "border_security", "yea", "yea_supports"),
  vote(2, "border_security", "yea", "yea_supports"),
  vote(3, "border_security", "yea", "yea_supports"),
  vote(4, "border_security", "yea", "yea_supports"),
  vote(5, "back_police", "yea", "yea_supports"),
  vote(6, "back_police", "yea", "yea_supports"),
  vote(7, "back_police", "yea", "yea_supports"),
  vote(8, "back_police", "nay", "yea_supports"),
  vote(9, "strong_defense", "yea", "yea_supports"),
  vote(10, "strong_defense", "yea", "yea_supports"),
  vote(11, "strong_defense", "nay", "yea_supports"),
  vote(12, "strong_defense", "nay", "yea_supports"),
  vote(13, "cut_spending", "yea", "yea_supports"),
  vote(14, "cut_spending", "yea", "yea_supports"),
  vote(15, "cut_spending", "yea", "yea_supports"),
  vote(16, "cut_spending", "nay", "yea_supports"),
  vote(17, "gov_transparency", "yea", "yea_supports"),
  vote(18, "pro_life", "yea", "yea_supports"),
];

const warm = boot(WARM_VOTES);
const cold = boot(null);

must(warm.PDXProfileCard && typeof warm.PDXProfileCard.brief === "function",
  "PDXProfileCard.brief() is unavailable — the card and the profile no longer share a path");
must(warm.PDXWordAction && typeof warm.PDXWordAction.read === "function",
  "PDXWordAction.read() is unavailable");
must(warm.CMP_DATA[MEMBER] && warm.CMP_DATA[PREZ], "the fixture subjects are not in the bundled roster");

// ── The renderer, painted with real reads ────────────────────────────────────
// The point of running the real hero-showcase.js rather than asserting on
// PDXProfileCard's data alone: the vocabulary rules are about what a reader SEES,
// and a lane-correct payload printed through a lane-blind template still ships
// "mapped votes on record" over a president.
function paint(engine, pid) {
  const p = engine.CMP_DATA[pid];
  const brief = engine.PDXProfileCard.brief(pid, p);
  const read = engine.PDXProfileCard.read(pid, p);
  let html = "";
  const listeners = {};
  const host = {
    hidden: true, innerHTML: "",
    setAttribute() {}, removeAttribute() {},
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    querySelector() { return null; },
  };
  const timers = [];
  const win = {
    console, Math, JSON, String, Number, Array, Object, Boolean, RegExp, Error,
    encodeURIComponent, parseInt, isNaN,
    Date: { now: () => 1_760_000_000_000 },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: (fn) => fn(),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    location: { hash: "" },
    document: {
      readyState: "complete", hidden: false,
      getElementById: (id) => (id === "hero-showcase" ? host : null),
      addEventListener() {},
    },
    addEventListener() {},
    PDXConsistency: { VERDICTS: engine.PDXConsistency.VERDICTS, recordSettled: () => true },
    PDXLazyData: { loaded: () => true },
    PDXDataEpoch: () => 1,
    PDXProfileCard: { brief: () => brief, read: () => read, warm() {}, share() {} },
    _getPhotoUrl: () => "",
    showProfile() {},
    PDX_HERO_SHOWCASE: [{
      pid, name: String(p.name || pid), office: "Office line",
      party: { label: "R", color: "#f87171" },
    }],
  };
  win.window = win;
  vm.runInContext(RENDERER, vm.createContext(win), { filename: "hero-showcase.js" });
  timers.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
  html = host.innerHTML;
  return { html, brief, read, hidden: host.hidden };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. One figure, and it is the profile's
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the card's percentage is the profile's percentage");
for (const pid of [MEMBER, PREZ]) {
  const p = warm.CMP_DATA[pid];
  const engine = warm.PDXWordAction.read(pid, p);
  const card = warm.PDXProfileCard.brief(pid, p);
  must(engine, `PDXWordAction.read() returned nothing for ${pid}`);
  must(card, `PDXProfileCard.brief() returned nothing for ${pid}`);

  eq(card.pct, engine.pct, `one figure (${pid}): the card's Direction Match is not the engine's`);
  eq(card.publishable, !!engine.publishable,
    `one figure (${pid}): the card and the engine disagree about whether there is a figure to publish`);
  eq(card.metric, (engine.frame && engine.frame.metric) || "",
    `one figure (${pid}): the card renamed the figure`);
  eq(card.verdict && card.verdict.key, engine.verdict && engine.verdict.key,
    `one figure (${pid}): the card's verdict is not the engine's`);
  eq(card.coverage.tested, engine.coverage.tested,
    `one figure (${pid}): the denominator under the figure is not the one the engine divided by`);
  // The empty state is a shared token too. Below the floor there is no percentage
  // on either surface — a card that fills that hole with a number it computed
  // itself is exactly the divergence this file exists to catch.
  ok(card.pct === null || engine.publishable,
    `one figure (${pid}): the card published a percentage the engine held back`);
  console.log(`  · ${pid}: pct=${JSON.stringify(card.pct)} publishable=${card.publishable} tested=${card.coverage.tested}`);
}
must(warm.PDXWordAction.read(MEMBER, warm.CMP_DATA[MEMBER]).publishable,
  "the seeded roll calls did not put the member over the publishing floor, so the warm case is not being tested");
must(warm.PDXWordAction.read(PREZ, warm.CMP_DATA[PREZ]).publishable,
  "the bundled executive record does not clear the publishing floor, so the exec case is not being tested");

// ═════════════════════════════════════════════════════════════════════════════
// 2. The epoch is the invalidation key, on the shared memo
// ═════════════════════════════════════════════════════════════════════════════
section("2 · a moved epoch cannot leave a stale figure on the card");
{
  const ep = boot(WARM_VOTES);
  let tick = 1;
  ep.PDXDataEpoch = () => tick;
  const before = ep.PDXProfileCard.brief(MEMBER, ep.CMP_DATA[MEMBER]);
  must(before && before.publishable, "harness: the epoch fixture is not publishable to begin with");
  // A lazy bundle merging new roll calls into the roster, with no warm event fired
  // — the exact path that used to leave a card holding a pre-merge figure.
  ep.PDXVotingRecord._records[MEMBER] = WARM_VOTES.concat([
    vote(21, "border_security", "nay", "yea_supports"),
    vote(22, "back_police", "nay", "yea_supports"),
    vote(23, "pro_life", "nay", "yea_supports"),
    vote(24, "strong_defense", "nay", "yea_supports"),
  ]);
  if (typeof ep.PDXDataChanged === "function") ep.PDXDataChanged();
  const stale = ep.PDXProfileCard.brief(MEMBER, ep.CMP_DATA[MEMBER]);
  tick++;
  const fresh = ep.PDXProfileCard.brief(MEMBER, ep.CMP_DATA[MEMBER]);
  const truth = ep.PDXWordAction.read(MEMBER, ep.CMP_DATA[MEMBER]);
  eq(fresh.pct, truth.pct, "epoch: after the bump the memo agrees with the engine again");
  eq(fresh.coverage.tested, truth.coverage.tested, "epoch: and on the denominator too");
  ok(stale !== fresh, "epoch: the memo was not recomputed when the epoch moved");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Two lanes, two vocabularies, no crossover
// ═════════════════════════════════════════════════════════════════════════════
section("3 · each card speaks its own lane");
eq(warm.PDXProfileCard.brief(PREZ, warm.CMP_DATA[PREZ]).lane, "exec",
  "lane: the president is not on the executive lane");
eq(warm.PDXProfileCard.brief(MEMBER, warm.CMP_DATA[MEMBER]).lane, "record",
  "lane: the member is not on the roll-call lane");

const prez = paint(warm, PREZ);
const member = paint(warm, MEMBER);
must(!prez.hidden && prez.html, "the executive card painted nothing");
must(!member.hidden && member.html, "the member card painted nothing");

// The executive card. Roll-call nouns describe a record this office does not keep.
for (const w of ["mapped vote", "mapped votes", "Voted Yea", "Voted Nay", "roll call", "roll-call"]) {
  lacks(prez.html, w, "exec vocabulary: the executive card borrowed a roll-call noun");
}
eq(prez.brief.coverage.votes, null,
  "exec vocabulary: a roll-call vote count reached the executive card's coverage payload");
ok(/What the formal record holds/.test(prez.html),
  "exec: the card carries the executive lane's own heading from the profile's strip");
ok(/executive order|signed law|memorandum|proclamation|veto/i.test(prez.html),
  "exec: the card prints no inventory at all, so there is no formal-lane story on it");
ok(/acts? on file/.test(prez.html),
  "exec: the executive chips are not counted in acts");

// The member card. Executive nouns describe instruments this office cannot issue.
for (const w of ["executive order", "Executive order", "signed law", "proclamation", "memorandum"]) {
  lacks(member.html, w, "member vocabulary: the member card borrowed an executive noun");
}
must(warm.PDXProfileCard._formalStrip(MEMBER, "record"),
  "the member's formal strip is empty, so the member-lane vocabulary case is not being tested");
ok(/What the record points to/.test(member.html),
  "member: the card carries the roll-call lane's own heading from the profile's strip");
ok(/votes? on file|vote on file/.test(member.html),
  "member: the member chips are not counted in votes");

// Neither may print an inventory it did not get from the engine.
const strip = warm.PDXProfileCard._formalStrip(PREZ, "exec");
must(strip && strip.chips.length, "the executive formal strip is empty, so the exec case is not being tested");
for (const c of strip.chips) {
  const shown = c.label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  ok(prez.html.includes(shown), `exec: chip "${c.label}" from the profile's own pick is missing from the card`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. The card and the profile agree on the same strip
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the strip on the card is the strip on the profile");
{
  const CS = warm.PDXConsistency;
  const xs = CS.execRecordSummary.pick(PREZ);
  const mine = warm.PDXProfileCard._formalStrip(PREZ, "exec");
  eq(mine.head, CS.execRecordSummary.HEAD, "strip: the executive heading is not the profile's");
  const want = xs.oneway.concat(xs.both).slice(0, 2).map((r) => r.key);
  eq(mine.chips.map((c) => c.key).join("|"), want.join("|"),
    "strip: the card selected different executive issues than the profile's own pick");

  const so = CS.recordStandout.pick(MEMBER);
  const mineM = warm.PDXProfileCard._formalStrip(MEMBER, "record");
  eq(mineM && mineM.head, CS.recordStandout.HEAD, "strip: the member heading is not the profile's");
  if (so.any) {
    const wantM = so.consistent.concat(so.mixed).slice(0, 2).map((x) => x.key);
    eq(mineM.chips.map((c) => c.key).join("|"), wantM.join("|"),
      "strip: the card selected different member issues than the profile's own pick");
  }
  // THE MIRROR. The card's depth line is not a paraphrase of the profile's — the
  // strings have to be the ones the profile's own strip renders, or two surfaces
  // state one denominator two ways.
  const soHtml = CS.recordStandout.html(MEMBER);
  const xsHtml = CS.execRecordSummary.html(PREZ);
  ok(String(soHtml).includes(mineM.depth),
    `mirror: the member card's depth line ("${mineM.depth}") is not the one the profile's strip prints`);
  ok(String(xsHtml).includes(mine.depth),
    `mirror: the executive card's volume clause ("${mine.depth}") is not the one the profile's strip prints`);
  ok(mine.inventory.length > 0, "mirror: the executive card carries no inventory");
  ok(String(xsHtml).includes(mine.inventory.join(" · ").replace(/&/g, "&amp;")),
    "mirror: the executive card's inventory is not the profile's inventory");

  // Withheld on the profile means withheld on the card. A record too thin for a
  // standout gets no chips here either.
  const thin = warm.PDXProfileCard._formalStrip("no_such_person_at_all", "record");
  eq(thin, null, "strip: a profile with no standout still produced a card strip");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Cold cache: no figure, and no pretending otherwise
// ═════════════════════════════════════════════════════════════════════════════
section("5 · a cold record never paints a final percentage");
{
  const p = cold.CMP_DATA[MEMBER];
  const engine = cold.PDXWordAction.read(MEMBER, p);
  const card = cold.PDXProfileCard.brief(MEMBER, p);
  must(!engine.publishable,
    "the cold fixture cleared the publishing floor with no roll calls fetched, so this case is not being tested");
  eq(card.pct, null, "cold: the card produced a percentage from an unwarmed record");
  eq(card.testedSay, "", "cold: a depth caption was printed under a figure that does not exist");
  const painted = paint(cold, MEMBER);
  ok(!/pdx-hs-sig-pct/.test(painted.html), "cold: the card painted a score element with nothing behind it");
  ok(!/\d\s*%/.test(painted.html), "cold: a percentage reached a cold card face");
  ok(!/pdx-hs-bar-seg/.test(painted.html) || painted.hidden,
    "cold: a breakdown bar was painted over an empty read");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Nothing on a card face is a second score, and nothing is party chrome
// ═════════════════════════════════════════════════════════════════════════════
section("6 · one score, no party metric");
for (const [who, r] of [["exec", prez], ["member", member]]) {
  for (const w of ["Party loyalty", "party loyalty", "Party Loyalty", "votes with", "Votes with",
                   "party line", "Party line", "party unity", "Party unity"]) {
    lacks(r.html, w, `${who}: a party-loyalty metric reached the card face`);
  }
  for (const w of ["Promise", "Promises Kept", "Pledge Score", "kept/broken", "Follow-Through"]) {
    lacks(r.html, w, `${who}: retired promise-era vocabulary reached the card face`);
  }
  eq((r.html.match(/\d+<span class="pdx-hs-sig-pct-u">%<\/span>/g) || []).length, 1,
    `${who}: the card prints something other than exactly one percentage`);
  ok(r.html.includes(String(r.brief.pct)),
    `${who}: the percentage on the face is not the one brief() published`);
  ok(r.html.includes(r.brief.metric),
    `${who}: the figure is not labelled with the engine's own name for it`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. The doors
// ═════════════════════════════════════════════════════════════════════════════
section("7 · the card opens on the record, and a chip opens the issue");
{
  const CODE = RENDERER.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  ok(/pdxsec-standout/.test(CODE),
    "door: the card no longer lands on the profile's record section");
  ok(/_pdxNavJump/.test(CODE),
    "door: the landing does not use the profile's own in-page navigator");
  ok(/'#record=' \+ encodeURIComponent/.test(CODE),
    "door: an issue chip no longer opens the existing #record=<pid>~<issue> dossier address");
  // The anchor has to be one the profile actually publishes, or the jump is a
  // no-op that looks like a working link.
  const CONSISTENCY = R("consistency.js");
  ok(CONSISTENCY.includes('id="pdxsec-standout"'),
    "door: pdxsec-standout is not an id the profile emits");
  const SPINE = R("profile-spine.js");
  ok(SPINE.includes("pdxsec-standout"),
    "door: the record section is not registered with the profile's stage rail");
  // Every chip on the painted card carries both halves of the address.
  const chips = prez.html.match(/<button[^>]*class="pdx-hs-fm-chip"[^>]*>/g) || [];
  ok(chips.length > 0, "door: the executive card painted no issue chips to open");
  for (const c of chips) {
    ok(/data-pid="[^"]+"/.test(c) && /data-iss="[^"]+"/.test(c),
      "door: a chip is missing the pid or the issue key it would open");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✖ homepage card lane: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error("  • " + f));
  process.exit(1);
}
console.log(`\n✓ homepage record card: ${passed} assertions passed — one figure, one lane, one door`);
