#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-self-defection.mjs — publishing the contradiction list without building
// a hypocrisy index
// ─────────────────────────────────────────────────────────────────────────────
// ⚖️ Word vs Action already produces the finding: for each issue where a person
// has a real stated position of their own and a formal act mapped to the same
// issue, the Official Record hands back one of four verdicts, and one of them is
// `contradicts`. self-defection.js gathers those verdicts into a dated list.
//
// Gathering per-person verdicts into one list is the exact move that produces a
// leaderboard by accident, so the fence is most of this file:
//
//   1. EVERY ITEM IS THE ENGINE'S OWN VERDICT. Not a re-derivation, not a looser
//      rule: for every item, PDXWordAction says `contradicts` on that issue and
//      PDXConsistency.officialRecord says `contradicts` on that issue. The
//      citation is the SAME string PDXConsistency.proof.proofText builds for the
//      profile row, so the list and the profile cannot cite different acts.
//   2. THE FLOOR IS DIRECTION MATCH'S. A real stated position (independently
//      worded, the scored item for its issue) × a formal act with a source URL.
//      A broken tracked pledge has no formal-act path and is not in the list.
//   3. DATE ORDER, AND NO OTHER ORDER. Strictly non-increasing by date, undated
//      last. Not by item count, not by weight, not by "severity".
//   4. NO SCORE AND NO RANKING, STRUCTURALLY. No percentage, ratio, rate or index
//      on any returned shape; no per-person tally in the cross-person feed; no
//      grouping by person; no leaderboard vocabulary in any rendered surface.
//   5. NO PARTY, AND NO PROSECUTORIAL VOICE. The copy names the record and stops.
//   6. NOTHING MOVED. Reading and rendering this list leaves Direction Match, the
//      formal pattern tiers, the publication floor and the mapped counts identical,
//      and no engine file names this lane at all.
//   7. EMPTY IS EMPTY. No record warm → no items, no frame. An empty frame under
//      "Against their own stated position" is an accusation with the evidence
//      pending.
//
//   node scripts/test-self-defection.mjs
//
// Real shipped modules in a node:vm sandbox, real member votes rebuilt offline
// from the shipped seeds by vr-record-corpus.mjs.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "self-defection.js", "profile-spine.js", "profiles-full.js",
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
const lacks = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) === -1,
    `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ self-defection: ${msg}`);
  process.exit(1);
};

// Comments must be able to quote the products this file refuses to build, so every
// source-level assertion runs against a comment-stripped copy.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ── THE LANE'S OWN WORDS vs THE WORDS IT QUOTES ─────────────────────────────
// A blacklist run over the whole rendered surface fails on the data: a stated
// position may contain "corrupt", an office title may contain "Democratic", and
// "familiar" contains "liar". Quoting a person's own sentence verbatim is the
// point of the surface, and censoring their vocabulary would be the dishonest
// move. So the copy fence runs over CHROME — everything this file wrote itself —
// with the quoted fields and every attribute removed.
const DATA_EL = ["pdxown-who", "pdxown-office", "pdxown-issue", "pdxown-said",
                 "pdxown-proof", "pdxown-multi", "pdxown-date", "pdxown-src"];
const chrome = (html) => {
  let h = String(html || "");
  for (const c of DATA_EL) {
    h = h.replace(new RegExp("<([a-z]+)([^>]*class=\"[^\"]*" + c + "[^\"]*\"[^>]*)>[\\s\\S]*?</\\1>", "g"),
      "<$1>[quoted]</$1>");
  }
  // hrefs, aria-labels and data attributes carry names and issue labels too.
  return h.replace(/<([a-z]+)[^>]*>/g, "<$1>");
};

const W = boot();
const SD = W.PDXSelfDefection;
must(SD && typeof SD.itemsFor === "function", "PDXSelfDefection.itemsFor is not exposed");
must(typeof SD.feed === "function" && typeof SD.personHtml === "function",
  "PDXSelfDefection.feed / personHtml are not exposed");

// The offline corpus, warmed into the record cache for a wide slice of members so
// the list has real contradictions in it rather than one hand-built fixture.
const { byMember } = buildCorpus(ROOT);
const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
must(ranked.length > 30, `the offline corpus is too small to census (${ranked.length} members)`);
const POP = ranked.slice(0, 80);
for (const [pid, items] of POP) W.PDXVotingRecord.noteMember(pid, items);

const PER = new Map();          // pid → items
for (const [pid] of POP) {
  const list = SD.itemsFor(pid, W.CMP_DATA[pid]);
  if (list.length) PER.set(pid, list);
}
const ALL = [...PER.values()].flat();
must(ALL.length >= 8, `too few real contradictions to fence (${ALL.length})`);
const FEED = SD.feed({ pids: POP.map(([p]) => p) });

// ── 1 · every item is the engine's own verdict, cited the engine's way ───────
{
  section("1 · the verdict and the citation both come from the engines");

  let checked = 0;
  for (const [pid, list] of PER) {
    const read = W.PDXWordAction.read(pid, W.CMP_DATA[pid]);
    for (const x of list) {
      checked++;
      // ⚖️ Word vs Action says contradicts on this issue…
      const word = (read.tested || []).filter((t) => t.issueKey === x.issueKey);
      ok(word.length === 1,
        `${pid}/${x.issueKey} is exactly one tested word item (got ${word.length})`);
      eq(word[0] && word[0].test && word[0].test.token, "contradicts",
        `${pid}/${x.issueKey} — the word-action verdict`);
      // …and so does the Official Record it was tested against.
      const ov = W.PDXConsistency.officialRecord(pid, x.issueKey);
      eq(ov && ov.token, "contradicts", `${pid}/${x.issueKey} — the officialRecord verdict`);
      // The citation is the shared proof line, not a second pick by this file.
      const top = ov && ov.record && ov.record.topContradiction;
      if (top) {
        eq(x.act.text, W.PDXConsistency.proof.proofText(top),
          `${pid}/${x.issueKey} cites the same act the profile row cites`);
        eq(x.act.url, (top.source && top.source.url) || "",
          `${pid}/${x.issueKey} cites that act's own source URL`);
      } else {
        ok(ov && ov.officialActions && ov.officialActions.total > 0,
          `${pid}/${x.issueKey} — a curated formal action stands behind the citation`);
      }
      eq(x.lane, String(ov.lane || "record"), `${pid}/${x.issueKey} names the engine's lane`);
      eq(x.say, SD.SAY[x.lane] || SD.SAY.record, `${pid}/${x.issueKey} — the lane's own sentence`);
    }
  }
  ok(checked === ALL.length, `every item was checked (${checked}/${ALL.length})`);
  console.log(`      ${ALL.length} items across ${PER.size} of ${POP.length} warmed files`);
}

// ── 2 · the floor: real stated position × citable formal act ─────────────────
{
  section("2 · Direction Match's own floor, item by item");

  for (const x of ALL) {
    ok(!!x.said.label, `${x.pid}/${x.issueKey} names the stated position`);
    ok(/^https?:\/\//i.test(x.act.url), `${x.pid}/${x.issueKey} act URL is a real link`);
    ok(x.act.text.length > 3, `${x.pid}/${x.issueKey} act is named, not just linked`);
    ok(!!x.personPath && x.personPath.indexOf("/p/") === 0,
      `${x.pid}/${x.issueKey} links to the person file`);
    eq(x.dossier.pid, x.pid, `${x.pid}/${x.issueKey} dossier link names this person`);
    eq(x.dossier.issueKey, x.issueKey, `${x.pid}/${x.issueKey} dossier link names this issue`);
  }

  // Record-derived word cannot contradict the record — word-action refuses to score
  // it, so it can never reach this list.
  for (const [pid, list] of PER) {
    const read = W.PDXWordAction.read(pid, W.CMP_DATA[pid]);
    for (const x of list) {
      const word = (read.tested || []).find((t) => t.issueKey === x.issueKey);
      ok(word && word.scored !== false, `${pid}/${x.issueKey} rests on scored word`);
      ok(word && word.kind !== "position-derived",
        `${pid}/${x.issueKey} does not rest on record-derived word`);
      // A broken tracked pledge is resolved by the pledge ledger, not by a formal
      // act, so it has no formal-act path and is excluded by construction.
      ok(word && word.test && word.test.basis !== "pledge-ledger",
        `${pid}/${x.issueKey} is not a pledge-ledger resolution`);
    }
  }

  // And the exclusion is real rather than vacuous: the corpus does contain broken
  // pledges, and none of them is in the list.
  let brokenPledges = 0;
  for (const [pid] of POP) {
    const read = W.PDXWordAction.read(pid, W.CMP_DATA[pid]);
    for (const t of read.tested || []) {
      if (t.test && t.test.basis === "pledge-ledger" && t.test.token === "contradicts") {
        brokenPledges++;
        const list = PER.get(pid) || [];
        ok(!list.some((x) => x.issueKey === t.issueKey && x.act.text === t.label),
          `${pid} broken pledge "${t.label}" is not published as a formal-act item`);
      }
    }
  }
  // The corpus may carry no broken pledge at all, which would make the assertion
  // above vacuous — so one is planted. A broken pledge is a real `contradicts`
  // verdict from testOf with basis 'pledge-ledger', and it must produce a Direction
  // Match contradiction and NO item here, because there is no formal act to cite.
  {
    const w = boot();
    const pid = [...PER.keys()][0];
    const issueKey = PER.get(pid)[0].issueKey;
    for (const [p2, items] of POP) w.PDXVotingRecord.noteMember(p2, items);
    const prof = w.CMP_DATA[pid];
    const beforeN = w.PDXSelfDefection.itemsFor(pid, prof).length;
    prof.promises = [{ title: "A planted broken pledge", detail: "seeded by the harness",
      verdict: "broken", issueKey: "gun_rights",
      sources: [{ label: "harness", url: "https://example.org/planted" }] }];
    const read = w.PDXWordAction.read(pid, prof);
    const planted = (read.tested || []).find((t) => t.kind === "pledge-tracked");
    ok(!!planted, "the planted pledge is tested by Direction Match");
    eq(planted && planted.test.token, "contradicts", "…as a contradiction");
    eq(planted && planted.test.basis, "pledge-ledger", "…resolved by the pledge ledger");
    const after = w.PDXSelfDefection.itemsFor(pid, prof);
    ok(!after.some((x) => x.said.label === "A planted broken pledge"),
      "a broken pledge is not published as a formal-act item");
    ok(after.length <= beforeN + 1,
      `the planted pledge added no item of its own (${beforeN} → ${after.length})`);
    ok(!after.some((x) => x.issueKey === "gun_rights" && x.act.text.indexOf("planted") !== -1),
      "…and nothing cites the pledge as a formal act");
    ok(issueKey.length > 0, "the seeded person had a real item to compare against");
  }
  console.log(`      ${brokenPledges} broken tracked pledges in the corpus, plus one planted — all left to the pledge ledger`);
}

// ── 3 · date order, and no other order ──────────────────────────────────────
{
  section("3 · reverse-chronological, undated last, nothing else sorted on");

  const check = (list, what) => {
    let sawUndated = false;
    for (let i = 0; i < list.length; i++) {
      const d = list[i].date;
      if (!d) { sawUndated = true; continue; }
      ok(!sawUndated, `${what}: no dated item follows an undated one (index ${i})`);
      if (i > 0 && list[i - 1].date) {
        ok(list[i - 1].date >= d, `${what}: index ${i} is not newer than index ${i - 1}`);
      }
    }
    // Every dated item prints its date; an undated one says the date is missing
    // rather than borrowing the look of one.
    list.forEach((x) => {
      if (x.date) ok(!!x.dateText, `${what}: a dated item prints its date`);
      else eq(x.dateText, "", `${what}: an undated item prints no date`);
    });
  };
  check(FEED.items, "feed");
  for (const [pid, list] of PER) check(list, pid);

  // The feed is not the per-person lists concatenated: it interleaves, which is what
  // a dated list does and what a grouped table cannot.
  if (PER.size > 1 && FEED.items.length > PER.size) {
    let switches = 0;
    for (let i = 1; i < FEED.items.length; i++) {
      if (FEED.items[i].pid !== FEED.items[i - 1].pid) switches++;
    }
    ok(switches >= PER.size - 1, `the feed interleaves people (${switches} switches)`);
  }

  // Sorting is stable and depends on nothing but the data: the same input twice is
  // the same list twice, and reversing the input does not reorder the output.
  const again = SD.feed({ pids: POP.map(([p]) => p) });
  eq(again.items.map((x) => x.pid + "/" + x.issueKey).join(","),
     FEED.items.map((x) => x.pid + "/" + x.issueKey).join(","), "the feed is deterministic");
  const rev = SD.feed({ pids: POP.map(([p]) => p).slice().reverse() });
  eq(rev.items.map((x) => x.pid + "/" + x.issueKey).join(","),
     FEED.items.map((x) => x.pid + "/" + x.issueKey).join(","),
     "input order does not change the feed");
}

// ── 4 · no score, no ranking — structurally ─────────────────────────────────
{
  section("4 · nothing on the shape or in the copy is a measurement of a person");

  eq(SD.scored, false, "the lane declares itself unscored");
  eq(SD.ranked, false, "the lane declares itself unranked");
  const NUMERIC = /^(score|pct|percent|percentage|rate|ratio|index|rank|grade|level|points|weight|severity)$/i;
  const walk = (obj, path) => {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach((k) => {
      ok(!NUMERIC.test(k), `${path}.${k} is not a measurement field`);
      if (obj[k] && typeof obj[k] === "object") walk(obj[k], path + "." + k);
    });
  };
  ALL.forEach((x, i) => walk(x, "item[" + i + "]"));
  walk(FEED, "feed");

  // Counts are counts. `people` and `items` are list lengths; there is no field
  // that is one divided by another, and `asked` bounds `people`.
  ok(FEED.coverage.people <= FEED.coverage.asked, "people counted never exceeds people asked");
  eq(FEED.coverage.items, ALL.length, "the feed counts every item it gathered");
  eq(FEED.ranked, false, "the feed declares itself unranked");
  eq(FEED.scored, false, "the feed declares itself unscored");

  const feedHtml = SD.feedHtml({ pids: POP.map(([p]) => p) });
  const persons = [...PER.keys()].map((pid) => SD.personHtml(pid, W.CMP_DATA[pid]));
  const RENDERED = [["feed", feedHtml], ...persons.map((h, i) => [[...PER.keys()][i], h])];
  ok(feedHtml.length > 500, "the feed renders");
  persons.forEach((h, i) => ok(h.length > 200, `${[...PER.keys()][i]} renders a section`));

  // The vocabulary of the product this is not — over the lane's own chrome, and
  // in affirmative forms, so the honest disclaimer ("this is a dated list, not a
  // ranking") is not read as the thing it disclaims.
  const RANK_WORDS = ["leaderboard", "ranked by", "ranking of", "most contradictory",
    "worst", "top 10", "top ten", "biggest", "hall of shame", "scoreboard",
    "hypocrisy index", "% of", "out of 100", "/100", "index score"];
  for (const [where, html] of RENDERED) {
    const c = chrome(html);
    for (const w of RANK_WORDS) lacks(c, w, `${where} chrome carries no ranking vocabulary`);
    // No percentage of any kind, anywhere — chrome or quoted.
    ok(!/\d\s*%/.test(html), `${where} prints no percentage`);
    // And the disclaimer is actually said, not merely not-contradicted.
    if (where === "feed") ok(/not a ranking/i.test(html), "the feed says it is not a ranking");
  }

  // No grouping by person in the feed: one list, no per-person heading or tally.
  eq((feedHtml.match(/<ul /g) || []).length, 1, "the feed is one flat list");
  lacks(feedHtml, "pdxown-group", "the feed has no per-person grouping");
  lacks(strip(R("self-defection.js")), "pdxown-group", "no grouping class exists to be added");
  // A person's name appearing beside a count of their items is a ranking with the
  // table left off. No item row prints any count at all.
  for (const x of FEED.items) {
    const row = SD.itemHtml(x, { withName: true });
    ok(!/\b\d+\s+(issues?|items?|contradictions?|times?)\b/i.test(row),
      `${x.pid}/${x.issueKey} row prints no tally`);
  }

  // The source itself sorts on date and label, and on nothing that is a magnitude.
  const CODE = strip(R("self-defection.js"));
  for (const bad of ["b.length", "a.length", "sort(function (a, b) { return b",
    "appliedWeight", "test.evidence", "counts.contradicts", "consistentScore",
    "contradictScore", ".score"]) {
    lacks(CODE, bad, "the lane sorts on nothing ordinal");
  }
}

// ── 5 · no party, and no prosecutorial voice ────────────────────────────────
{
  section("5 · the copy states the record and stops");

  const feedHtml = SD.feedHtml({ pids: POP.map(([p]) => p) });
  const surfaces = [["feed", feedHtml]];
  for (const pid of PER.keys()) surfaces.push([pid, SD.personHtml(pid, W.CMP_DATA[pid])]);

  const VOICE = ["betray", "hypocri", "liar", " lied", "lying", "sold out", "sellout",
    "sold their", "flip-flop", "flipflop", "two-faced", "shame", "disgrace", "caught red",
    "exposed", "snuck", "sneak", "corrupt", "crooked", "scandal", "outrage", "brazen",
    "shameless", "sabotag", "stabbed"];
  const PARTY = ["republican", "democrat", "gop", "(r-", "(d-", "left-wing", "right-wing",
    "partisan", "party line"];
  for (const [where, html] of surfaces) {
    const c = chrome(html);
    for (const w of VOICE) lacks(c, w, `${where} chrome keeps a descriptive voice`);
    for (const w of PARTY) lacks(c, w, `${where} chrome frames no party`);
    // The quoted halves are still real quotes: escaped, and never raw markup.
    ok(!/<script|onerror=|onclick="[^"]*\(/i.test(html), `${where} escapes what it quotes`);
    ok(c.indexOf("[quoted]") !== -1, `${where} has quoted data to separate from its chrome`);
  }

  // The one sentence per lane, and no other claim about intent.
  const SAYS = Object.keys(SD.SAY).map((k) => SD.SAY[k]);
  ok(SAYS.length >= 3, "each formal lane has its own sentence");
  for (const s of SAYS) {
    ok(/they had stated/.test(s), `"${s}" attributes the position to them`);
    for (const w of VOICE) lacks(s, w, `"${s}" is descriptive`);
    ok(!/because|in order to|to please|in exchange/.test(s), `"${s}" claims no motive`);
  }

  // No party field on the shape at all — there is nowhere for one to be printed.
  for (const x of ALL) {
    ok(!("party" in x), `${x.pid}/${x.issueKey} carries no party field`);
    ok(JSON.stringify(x).toLowerCase().indexOf('"party"') === -1,
      `${x.pid}/${x.issueKey} carries no nested party field`);
  }

  // The stylesheet does not deliver a verdict the words declined to: no yes/no
  // palette, and nothing that scales with how many rows a person has.
  const CSS = R("self-defection.css");
  for (const bad of ["#f87171", "#4ade80", "#86efac", "#fca5a5", "nth-child", "nth-of-type"]) {
    lacks(strip(CSS), bad, "the stylesheet neither grades nor scales");
  }
}

// ── 6 · nothing moved, and no engine knows this lane exists ─────────────────
{
  section("6 · the wall");

  const KEYS = ["directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor",
    "formalActCounts", "ballotSort", "yourMatch", "anyCrossPersonRanking",
    "anyLeaderboard", "anyCompositeScore"];
  for (const k of KEYS) ok(SD.NEVER_FEEDS.indexOf(k) !== -1, `NEVER_FEEDS declares ${k}`);

  // Static: the engines do not name this lane. A read that no engine can reach
  // cannot feed one.
  const ID = /PDXSelfDefection|selfDefect|self-defection|pdxown-/;
  for (const f of ["word-action.js", "consistency.js", "publication-floor.js",
                   "voting-record.js", "stance-helpers.js", "my-profile.js",
                   "finance-lane.js", "ballot-actions.js"]) {
    let src; try { src = R(f); } catch (e) { continue; }
    ok(!ID.test(src), `${f} does not name the self-defection lane`);
  }
  // No class this stylesheet defines is defined anywhere else. The first draft of
  // this file used the `pdxsd-` prefix, which consistency.js already injects for the
  // Say-vs-Do act rows — a stylesheet quietly restyling another module's surface.
  {
    const mine = [...new Set((R("self-defection.css").match(/\.pdxown-[a-z0-9-]+/g) || [])
      .map((c) => c.slice(1)))];
    ok(mine.length > 10, `the stylesheet defines its classes under one prefix (${mine.length})`);
    const others = ["consistency.js", "word-action.js", "profiles-full.js", "voting-record.js",
      "my-profile.js", "impact-ledger.js", "impact-ledger.css", "my-profile.css",
      "person-file.css", "finance-lane.js", "stance-tree.js", "profile-dossier.js"];
    for (const f of others) {
      let src; try { src = R(f); } catch (e) { continue; }
      for (const c of mine) {
        if (f === "self-defection.js") continue;
        ok(src.indexOf(c) === -1, `${f} does not already use the class ${c}`);
      }
    }
  }

  // …and exactly the two surfaces that should, do.
  ok(/PDXSelfDefection/.test(R("profiles-full.js")), "the profile mounts the list");
  ok(/self-defection\.js/.test(R("index.html")), "index.html loads the lane");
  ok(/self-defection\.css/.test(R("index.html")), "index.html loads its stylesheet");

  // Runtime: reading and rendering the list changes no published figure.
  const PIDS = [...PER.keys()];
  const snapshot = (w) => {
    for (const [pid, items] of POP) w.PDXVotingRecord.noteMember(pid, items);
    const out = [];
    for (const pid of PIDS) {
      const wa = w.PDXWordAction.read(pid, w.CMP_DATA[pid]);
      out.push(["dm", pid, wa && wa.pct, wa && wa.token, wa && wa.publishable,
        wa && wa.tested.length, wa && wa.untested.length,
        JSON.stringify(wa && wa.counts), JSON.stringify(wa && wa.tiers),
        JSON.stringify(wa && wa.floors), JSON.stringify(wa && wa.coverage)].join("|"));
      const rows = (w.PDXConsistency.formalPatternIndex.rows(pid) || []).map((r) =>
        [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
      out.push(["tiers", pid, rows.join(",")].join("|"));
      const counts = w._pdxRecordMappedCounts ? w._pdxRecordMappedCounts(pid) : null;
      out.push(["mapped", pid, JSON.stringify(counts)].join("|"));
      const F = w.PDXPublicationFloor;
      if (F && typeof F.read === "function") {
        try { out.push(["floor", pid, JSON.stringify(F.read(pid))].join("|")); } catch (e) {}
      }
    }
    return out.join("\n");
  };

  const clean = boot();
  const before = snapshot(clean);
  ok(before.length > 400, `the snapshot has something in it (${before.length} chars)`);

  const used = boot();
  const after1 = snapshot(used);
  eq(after1, before, "two clean boots agree");
  // Now exercise the lane hard on the same window, then re-read every figure.
  for (const pid of PIDS) {
    used.PDXSelfDefection.itemsFor(pid, used.CMP_DATA[pid]);
    used.PDXSelfDefection.personHtml(pid, used.CMP_DATA[pid]);
  }
  used.PDXSelfDefection.feed({ pids: POP.map(([p]) => p) });
  used.PDXSelfDefection.feedHtml({ pids: POP.map(([p]) => p), limit: 5 });
  eq(snapshot(used), before, "nothing the lane published moved a figure");

  // The items themselves are not mutated versions of the engine's rows: mutating a
  // returned item does not change the next read.
  const one = SD.itemsFor(PIDS[0], W.CMP_DATA[PIDS[0]]);
  one[0].issue = "MUTATED";
  const two = SD.itemsFor(PIDS[0], W.CMP_DATA[PIDS[0]]);
  ok(two[0].issue !== "MUTATED", "a returned item is not a live handle into the engine");
}

// ── 7 · empty is empty ──────────────────────────────────────────────────────
{
  section("7 · no record warm → no items, no frame");

  const cold = boot();
  const pid = [...PER.keys()][0];
  eq(cold.PDXSelfDefection.itemsFor(pid, cold.CMP_DATA[pid]).length, 0,
    "a cold record produces no items");
  eq(cold.PDXSelfDefection.personHtml(pid, cold.CMP_DATA[pid]), "",
    "a cold record renders no section");
  eq(cold.PDXSelfDefection.feedHtml({ pids: [pid] }), "", "…and no feed");
  // A cold record is not a clean one, and nothing rendered says otherwise.
  const f = cold.PDXSelfDefection.feed({ pids: [pid] });
  eq(f.items.length, 0, "the cold feed is empty");
  eq(f.coverage.people, 0, "…and counts nobody");

  // Unknown ids, missing profiles and a missing population are all silent rather
  // than thrown.
  eq(SD.itemsFor("no_such_person_at_all", null).length, 0, "an unknown id is silent");
  eq(SD.itemsFor("", null).length, 0, "an empty id is silent");
  eq(SD.feed({}).items.length, 0, "no population asked for is an empty feed");
  eq(SD.feed({ pids: [] }).coverage.asked, 0, "…and counts nobody asked");
  eq(SD.personHtml("no_such_person_at_all", null), "", "an unknown id renders nothing");

  // The limit truncates and SAYS it truncated, rather than presenting a short list
  // as the whole list.
  if (ALL.length > 3) {
    const cut = SD.feed({ pids: POP.map(([p]) => p), limit: 3 });
    eq(cut.items.length, 3, "the limit is honoured");
    eq(cut.coverage.truncated, ALL.length - 3, "…and the remainder is counted");
    ok(SD.feedHtml({ pids: POP.map(([p]) => p), limit: 3 }).indexOf("not shown here") !== -1,
      "…and stated in the markup");
  }
}

// ── report ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ self-defection: ${failures.length} of ${passed + failures.length} assertions failed`);
  failures.slice(0, 40).forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ self-defection: ${passed} assertions passed`);
console.log(`  ${ALL.length} contradictions listed across ${PER.size} files · dated order only · no score, no ranking`);
