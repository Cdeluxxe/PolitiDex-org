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
import { execFileSync } from "node:child_process";
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
  // 📋 The coverage inventory line. Loaded because both surfaces under test now
  // read their depth clause out of it — the profile's record strip prints it and
  // the card asks the same composer for the same clause. Without it on the page
  // both fall back, which would pass the mirror for the wrong reason.
  "inventory.js",
  // 🎨 The issue colour tokens. Loaded because the card's record rows now wear the
  // same token the profile brief and the topic tree wear for the same key, and the
  // parity check below compares the two strings. Absent, PDXIssueColors.skin()
  // is simply unavailable and both surfaces emit no attribute at all — which would
  // pass the comparison for the wrong reason.
  "issue-colors.js",
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
    // The colour module, handed over as-is rather than stubbed: the parity check
    // below compares the attribute the renderer emits against the attribute the
    // profile surfaces emit, and a stub would make both sides agree about nothing.
    PDXIssueColors: engine.PDXIssueColors,
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

// The card's chips are a SELECTION from the profile's own pick, never a re-pick:
// same rows, same source, same order, and never more than the card has room for.
// The one editorial rule on top of that is the reserved slot — where the profile
// found an issue whose acts ran both ways, the card must carry one, because a
// record that contradicts itself is the more interesting half of "what the record
// points to" and a straight take-the-first-N drops it whenever the one-sided
// issues fill the card first.
const CARD_CHIPS = 3;
function sameStrip(lane, mine, oneSided, split) {
  const keys = mine.chips.map((c) => c.key);
  const pick = oneSided.concat(split).map((r) => r.key);
  ok(keys.length > 0 && keys.length <= CARD_CHIPS,
    `strip: the ${lane} card carries ${keys.length} chips — it must carry 1 to ${CARD_CHIPS}`);
  for (const k of keys) {
    ok(pick.includes(k),
      `strip: the ${lane} card printed "${k}", which is not in the profile's own pick`);
  }
  const order = keys.map((k) => pick.indexOf(k));
  ok(order.every((n, i) => i === 0 || n > order[i - 1]),
    `strip: the ${lane} card reordered the profile's pick`);
  if (split.length) {
    ok(keys.some((k) => split.map((r) => r.key).includes(k)),
      `strip: the ${lane} profile found an issue whose acts ran both ways and the card dropped it`);
  }
  if (oneSided.length) {
    eq(keys[0], oneSided[0].key,
      `strip: the ${lane} card does not lead with the profile's strongest one-sided issue`);
  }
}
{
  const CS = warm.PDXConsistency;
  const xs = CS.execRecordSummary.pick(PREZ);
  const mine = warm.PDXProfileCard._formalStrip(PREZ, "exec");
  eq(mine.head, CS.execRecordSummary.HEAD, "strip: the executive heading is not the profile's");
  sameStrip("executive", mine, xs.oneway, xs.both);

  const so = CS.recordStandout.pick(MEMBER);
  const mineM = warm.PDXProfileCard._formalStrip(MEMBER, "record");
  eq(mineM && mineM.head, CS.recordStandout.HEAD, "strip: the member heading is not the profile's");
  if (so.any) {
    sameStrip("member", mineM, so.consistent, so.mixed);
  }
  // THE MIRROR. The card's depth line is not a paraphrase of the profile's — the
  // strings have to be the ones the profile's own strip renders, or two surfaces
  // state one denominator two ways.
  const soHtml = CS.recordStandout.html(MEMBER);
  const xsHtml = CS.execRecordSummary.html(PREZ);
  // The member strip's depth clause is inside the coverage inventory line now, and
  // that line bolds its counts (<b>18</b> formal acts across <b>6</b> issues), so
  // the comparison is against the rendered TEXT rather than the raw markup. The
  // rule being enforced is unchanged: the card must print the profile's own string,
  // not a paraphrase of it.
  const soText = String(soHtml).replace(/<[^>]*>/g, "");
  ok(soText.includes(mineM.depth),
    `mirror: the member card's depth line ("${mineM.depth}") is not the one the profile's strip prints`);
  // …and it must be the inventory's composition, not the retired .pdxso-depth
  // wording. A card falling back to the old phrase while the profile prints the new
  // one is exactly the two-wordings failure this section exists to catch.
  ok(/^\d+ formal acts? across \d+ issues?$/.test(mineM.depth),
    `mirror: the member card's depth line is not the inventory's formal clause — got "${mineM.depth}"`);
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

// ═════════════════════════════════════════════════════════════════════════════
// 8. The card wears the person file's record-first face
// ═════════════════════════════════════════════════════════════════════════════
// THE CARD IS THE FIRST PERSON-FILE A STRANGER SEES, so it must speak the face
// the person file speaks: coloured issue rows, the 🏛 record badge, and the
// cross-check demoted to a footer. This section is the contract for the parts a
// second surface could silently reinvent — the colour token and the badge's words.
// Nothing here checks a number that is not already checked above: the card still
// publishes exactly one figure and section 6 owns that.
section("8 · the card wears the record-first face");
{
  const IC = warm.PDXIssueColors;
  must(IC && typeof IC.skin === "function",
    "PDXIssueColors.skin() is absent, so nothing below is testing the shared colour token");

  // ── THE TOPIC TREE'S TOKEN IS THE SHARED HELPER'S TOKEN ─────────────────
  // Every coloured stance row on a person file carries the four custom properties
  // inline. Read them back off the rendered tree and compare to the helper the card
  // goes through: if these ever diverge, "the card matches the tree" stops meaning
  // anything and the rest of this section passes vacuously.
  const treeTokens = (html) => {
    const out = new Map();
    const re = /class="pdxst-row pdxc-ic" style="([^"]*)"[^>]*data-pdxst-issue="([^"]+)"/g;
    let m;
    while ((m = re.exec(html))) out.set(m[2], m[1]);
    return out;
  };
  // A profile whose tree actually holds a climate_action row, which is the row the
  // brief for this pass names. `aoc` is shipped roster data, not a fixture.
  const CLIMATE_PID = "aoc";
  const tree = treeTokens(warm.PDXConsistency.stancesSectionHtml(CLIMATE_PID) || "");
  must(tree.size > 0, `the ${CLIMATE_PID} topic tree painted no coloured rows, so the token comparison has no left-hand side`);
  must(tree.has("climate_action"),
    `the ${CLIMATE_PID} topic tree holds no climate_action row, so the named parity case is not being tested`);
  for (const [key, style] of tree) {
    eq(style, IC.styleFor(key),
      `colour: the ${CLIMATE_PID} tree row for "${key}" does not carry PDXIssueColors' own token`);
  }
  // The named assert, stated on its own so a failure says which key broke.
  eq(tree.get("climate_action"), IC.skin("climate_action").style,
    "colour: the climate_action token on a topic tree is not the token the card's helper emits");

  // ── AND THE CARD'S ROWS WEAR IT, KEY BY KEY ─────────────────────────────
  // Byte-identical to the helper's attribute, which is byte-identical to the tree's
  // (above). A key the helper declines carries no [data-ic] at all — a card of
  // neutral-slate rails would look like the colour system was off rather than like
  // three non-core issues.
  for (const [who, r] of [["exec", prez], ["member", member]]) {
    const tags = r.html.match(/<button[^>]*class="pdx-hs-fm-chip"[^>]*>/g) || [];
    must(tags.length > 0, `the ${who} card painted no record rows, so the row face is not being tested`);
    let tinted = 0;
    for (const tag of tags) {
      const key = (tag.match(/data-iss="([^"]+)"/) || [])[1] || "";
      const skin = IC.skin(key);
      if (skin.on) {
        tinted++;
        ok(tag.includes(skin.attr),
          `${who}: the row for "${key}" does not carry the shared issue token`);
      } else {
        ok(!/data-ic=/.test(tag),
          `${who}: the row for "${key}" was tinted with a token that key does not resolve to`);
      }
    }
    ok(tinted > 0, `${who}: not one record row on the card resolved an issue colour`);
  }

  // ── THE BADGE IS THE ENGINE'S BADGE ─────────────────────────────────────
  // Same words as the profile's own chip for the same row, and the lane marker in
  // front of them: "supports" without it reads as a stance, and this badge is the
  // record's rather than theirs.
  const CS = warm.PDXConsistency;
  const LANE = CS.recordPattern && CS.recordPattern.LANE;
  must(LANE, "PDXConsistency.recordPattern.LANE is absent, so the card would be authoring its own lane marker");
  // The person file's own stance rows, keyed by issue: same engine, same tier, and
  // the surface whose badge this one is a copy of. Compared key by key rather than
  // as a bag of labels, because two surfaces agreeing on the SET of words while
  // disagreeing about which row wears which is the failure that matters.
  const fileBadges = (() => {
    const out = new Map();
    const html = String(CS.stancesSectionHtml(MEMBER) || "");
    for (const frag of html.split('class="pdxst-row ').slice(1)) {
      const k = (frag.match(/data-pdxst-issue="([^"]+)"/) || [])[1];
      const lb = (frag.match(/class="pdxst-pat-lb">([^<]*)</) || [])[1];
      if (k && lb) out.set(k, lb);
    }
    return out;
  })();
  must(fileBadges.size > 0,
    "the member's stance rows painted no record badges, so the badge comparison has no left-hand side");
  const mStrip = warm.PDXProfileCard._formalStrip(MEMBER, "record");
  must(mStrip && mStrip.chips.length,
    "the member formal strip is empty, so the badge case is not being tested");
  const badged = mStrip.chips.filter((c) => c.badge);
  must(badged.length > 0,
    "no member card row carried a record badge, so the badge case is not being tested");
  for (const c of badged) {
    const b = c.badge;
    eq(b.lane, LANE, `badge: the row for "${c.key}" printed a lane marker of its own`);
    ok(fileBadges.has(c.key), `badge: the person file prints no record badge on "${c.key}" at all`);
    eq(b.label, fileBadges.get(c.key),
      `badge: the card and the person file disagree about what the record says on "${c.key}"`);
    ok(member.html.includes('class="pdx-hs-fm-b-lb">' + b.label + "<"),
      `badge: "${b.label}" was composed but never painted onto the card`);
    // The side word is the engine's, and it survives beside the badge rather than
    // being replaced by it.
    ok(member.html.includes('class="pdx-hs-fm-v">' + c.word + "<"),
      `badge: the side word "${c.word}" left the row when the badge arrived`);
  }
  // No hex is chosen on the card: the tone colour and the fill are the profile
  // chip's, off recordPattern.paint() and the same tone table the chip reads.
  const TONE = (CS.recordPattern && CS.recordPattern.TONE) || {};
  must(TONE.support && TONE.support.c,
    "recordPattern.TONE is absent, so the badge's colours are not being checked against anything");
  for (const c of badged) {
    const t = TONE[c.badge.tone];
    ok(t && c.badge.c === t.c,
      `badge: the row for "${c.key}" painted tone "${c.badge.tone}" as ${c.badge.c}, which is not that tone in recordPattern.TONE`);
    eq(c.badge.bg, CS.recordPattern.paint(c.badge).bg,
      `badge: the fill on "${c.key}" is not the fill the profile chip's own rule gives its weight`);
  }

  // ── A SPLIT ROW PRINTS BOTH SIDES ───────────────────────────────────────
  // The failure this exists for: a split row whose publication decision withheld
  // its countable printed the bare word "Split" onto the first card a stranger
  // sees, with the two integers sitting one field away on the same tier.
  const split = badged.find((c) => c.badge.tier === "split");
  must(split, "no member card row ran both ways, so the split case is not being tested");
  ok(/^\d+ advanced · \d+ against$/.test(split.badge.counts),
    `split: the row for "${split.key}" printed "${split.badge.counts}" instead of both sides`);
  ok(member.html.includes("\u00b7 " + split.badge.counts) ||
     member.html.includes("· " + split.badge.counts),
    `split: the two sides of "${split.key}" were composed but never painted`);

  // ── AND THE CROSS-CHECK IS A FOOTER ─────────────────────────────────────
  // Order on the face, not just in the stylesheet: the record block opens the card
  // body and the Word vs Action badge follows it.
  for (const [who, r] of [["exec", prez], ["member", member]]) {
    const fm = r.html.indexOf('class="pdx-hs-fm"');
    const sig = r.html.indexOf('class="pdx-hs-signal');
    must(fm >= 0 && sig >= 0, `the ${who} card is missing the record block or the signal badge`);
    ok(fm < sig, `${who}: Word vs Action is painted above the record it is checking`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section("9 · twin boot — the six showcase cards say what HEAD said");
// THE WALL THIS PASS WORKED UNDER, MEASURED. Colouring the rows, badging them and
// demoting the percent is display; the ISSUES a card names, the SIDE WORD beside
// each one and the WORD-VS-ACTION figure at the bottom are judgement, and not one
// of them was this pass's to move. So the six pids the carousel actually opens on
// are read twice — once out of HEAD's engines, once out of this tree's — and the
// three judged fields are compared byte for byte.
//
// The badge is deliberately NOT in the comparison: it is what the pass adds, and it
// is proved against the person file's own strip in section 8 rather than against a
// HEAD that never printed it. Nothing else on the card is exempt.
{
  const SHOWCASE = ["trump", "bennie_thompson", "lee", "jayapal", "scalise", "khanna"];
  let headSrc = null;
  try {
    headSrc = FILES.map((f) => [f, execFileSync("git", ["show", `HEAD:${f}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })]);
  } catch { headSrc = null; }
  if (!headSrc) {
    console.log("      (no git baseline available — the twin boot did not run in this environment)");
  } else {
    // The judged surface of one card, in the shape the renderer reads it in. The
    // strip is asked for on the card's OWN lane, which is what hero-showcase.js does.
    const judged = (win, pid) => {
      const PC = win.PDXProfileCard;
      const b = PC.brief(pid) || {};
      const rows = (PC._formalStrip(pid, b.lane) || { chips: [] }).chips || [];
      return JSON.stringify({
        lane: b.lane || "", score: b.score === null || b.score === undefined ? null : b.score,
        read: b.read || "", label: b.label || "",
        rows: rows.map((c) => ({ key: c.key, label: c.label, word: c.word, depth: c.depth })),
      });
    };
    // EVERY MEMBER PID IS SEEDED, on both sides, with the same fixture. Five of the
    // six carousel cards are on the record lane, and a member's characterised rows
    // exist only once the roll-call cache is warm — so an unseeded twin boot compares
    // five empty row lists to five empty row lists and passes without having read a
    // single side word. The fixture is the suite's own WARM_VOTES, installed under
    // each pid, which puts real rows on every card and makes the comparison mean what
    // it says. Whether a given pid has stated positions on those keys is the shipped
    // data's business; a card that produces no row on either side is refused below.
    const bootFrom = (src) => {
      const win = makeSandbox();
      const ctx = vm.createContext(win);
      win._pdxOfficeLine = () => "";
      win._getPhotoUrl = () => "";
      win.PROFILES = undefined;
      for (const [f, t] of src) vm.runInContext(t, ctx, { filename: f });
      win.PROFILES = win.CMP_DATA;
      if (win.PDXVotingRecord && win.PDXVotingRecord._records) {
        for (const pid of SHOWCASE) win.PDXVotingRecord._records[pid] = WARM_VOTES;
        if (typeof win.PDXDataChanged === "function") win.PDXDataChanged();
      }
      return win;
    };
    // HEAD has no issue-colors.js seam and no card badge, but it has every file in
    // FILES, so the two boots load the same list and differ only in its contents.
    const was = bootFrom(headSrc), now = bootFrom(SRC);
    let compared = 0, withRows = 0;
    for (const pid of SHOWCASE) {
      const a = judged(was, pid), b = judged(now, pid);
      eq(b, a, `${pid}: the card's issues, side words or Word-vs-Action figure moved against HEAD`);
      const rows = JSON.parse(b).rows;
      if (rows.length) withRows++;
      // A side word is the thing under comparison, so at least one has to be there.
      for (const r of rows) must(r.word, `${pid}: the row for "${r.key}" carries no side word to compare`);
      compared++;
    }
    ok(compared === 6, `all six showcase cards were read on both sides (${compared})`);
    must(withRows === 6,
      `only ${withRows} of the six showcase cards produced characterised rows — the rest of this ` +
      "comparison would be six empty lists matching six empty lists");
    ok(JSON.parse(judged(now, "trump")).rows.length > 0 &&
       JSON.parse(judged(now, SHOWCASE[3])).rows.length > 0,
      "the twin boot covered both card lanes — an exec card and a member card");
    // And the list itself is the six the carousel opens on, in that order — a
    // comparison over a rotation that quietly reordered proves nothing.
    const pool = JSON.parse(R("hero-showcase-data.js").slice(
      R("hero-showcase-data.js").indexOf("["), R("hero-showcase-data.js").lastIndexOf("]") + 1));
    eq(pool.slice(0, 6).map((c) => c.pid).join(","), SHOWCASE.join(","),
      "the six pids compared above are no longer the six the invitation list opens with");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✖ homepage card lane: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error("  • " + f));
  process.exit(1);
}
console.log(`\n✓ homepage record card: ${passed} assertions passed — one figure, one lane, one door`);
