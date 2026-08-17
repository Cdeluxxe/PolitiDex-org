#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-row-vocabulary.mjs — the issue row teaches the words the issue row prints
// ─────────────────────────────────────────────────────────────────────────────
// A stance row now makes several claims in vocabulary the product invented:
//
//     Formal · Direction match · this issue · 100% · ✓ Backed up · 1 aligned · 0 against
//     Formal · — Not tested yet · 6 votes on file — all 6 advanced it · …
//
// Every underlined idea there was, until this pass, defined nowhere a reader
// could reach from the row. `LT('directionmatch', …)` was already being called on
// one distant surface against a glossary key that did not exist, so it silently
// degraded to plain text — the teaching layer was wired to a definition nobody
// had written. Meanwhile "advanced it", "cut against it", "ran both ways" and the
// aligned/against denominator arrived with the recent honesty ships and were
// never added to the glossary at all. A skeptical first-time voter met the claim
// several screens before the definition, which is the wrong order for the one
// audience this surface exists for.
//
// This harness pins the four promises that fix makes:
//
//   1. THE DEFINITIONS EXIST, and are reachable by the exact key the row asks
//      for. A term() call against a missing key renders plain text, so a typo or
//      a deletion here is invisible at runtime — nothing would ever throw.
//   2. THE ROW ACTUALLY ASKS. The metric, the unscored label, the record's own
//      direction and the denominator each carry a real teaching control on the
//      rendered face, at the phrase itself rather than in a footer.
//   3. THE COPY DOES NOT CONTRADICT THE WALLS it describes — checked against the
//      behaviour, not just read: said-vs-did only, one issue not the profile
//      score, the public lane kept separate, record-direction never converted
//      into a stance, the denominator never a second score.
//   4. THE SCORE PATH IS UNTOUCHED. The same profile is rendered twice, once with
//      the education layer loaded and once without it, and every row result must
//      be identical. Teaching that can move a number is not teaching.
//
// Subjects: `trump` (dense executive record → scored rows with a denominator) and
// a congressional member seeded with roll calls shaped to produce all three
// record-direction clauses — a uniform run, a deep split, and a shallow one.
//
//   node scripts/test-row-vocabulary.mjs
//
// Real shipped modules in a node:vm sandbox. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// pdx-learn.js sits immediately before consistency.js, matching index.html's
// load order — the education layer must be present when the rows are built.
const BASE = [
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
  "profile-spine.js",
];
const withLearn = BASE.slice();
withLearn.splice(withLearn.indexOf("consistency.js"), 0, "pdx-learn.js");

const SRC = new Map();
for (const f of new Set([...BASE, ...withLearn])) SRC.set(f, R(f));

function boot(files) {
  const w = makeSandbox();
  const sb = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  for (const f of files) vm.runInContext(SRC.get(f), sb, { filename: f });
  w.PROFILES = w.CMP_DATA;
  return w;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
// A probe that names a term, a row or a clause is only meaningful while that
// thing exists. If one vanishes the assertions built on it pass vacuously, which
// is worse than failing — so the harness stops instead of reporting green.
const must = (cond, what) => {
  if (cond) return;
  console.error(`\nSTALE HARNESS: ${what}`);
  process.exit(2);
};

const PRES = "trump";
const MEMBER = "massie";

// ── The two realms ───────────────────────────────────────────────────────────
const win = boot(withLearn);
const bare = boot(BASE);
const CS = win.PDXConsistency;
const CS_SRC = SRC.get("consistency.js");
must(!!win.PDXLearn, "pdx-learn.js still exports window.PDXLearn");
must(!bare.PDXLearn, "the control realm is genuinely without the education layer");
const L = win.PDXLearn;

// ── The seed: one member, three record shapes ────────────────────────────────
// The record-direction index refuses to characterise a member we hold too little
// of (a floor of 12 mapped records), so the seed has to clear that floor before
// any clause appears at all. Three issues with no stated position on file, shaped
// to produce the three sentences a reader can actually meet:
//   UNIFORM  — 6 votes, all one way          → "all 6 advanced it"
//   SPLIT    — 5 for / 3 against, deep enough → "5 advanced it, 3 cut against it"
//   BOTHWAYS — 2 for / 2 against, too shallow → "they ran both ways"
//
// The three keys are DISCOVERED rather than assumed. The index deliberately
// declines to characterise issues with no curated directional pole ("balance"
// keys and the like), and those sit interleaved with usable ones in the issue
// map — picking the first three silent keys lands on one about half the time and
// would leave this harness asserting on a clause the engine correctly refused to
// write. So a throwaway uniform seed is run first, and only keys the index is
// willing to speak about are kept.
const stanceKeys = new Set(CS.issueRows(MEMBER).filter((r) => r.said).map((r) => r.key));
const silentKeys = Object.keys(win.ISSUE_MAP || {}).filter((k) => !stanceKeys.has(k));
must(silentKeys.length >= 3,
  `${MEMBER} no longer has issues without a stated position to seed`);

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "H.R. " + (200 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});

const CANDIDATES = silentKeys.slice(0, 12);
{
  const probe = [];
  let n = 0;
  for (const k of CANDIDATES) for (let i = 0; i < 6; i++) probe.push(vote(n++, k, "yea"));
  win.PDXVotingRecord.noteMember(MEMBER, probe);
}
const usable = CANDIDATES.filter((k) => {
  const idx = win._pdxRecordDirection(MEMBER, k, { noun: { one: "vote", many: "votes" } });
  return !!idx && idx.token === "record_direction" && !idx.suppressed;
});
must(usable.length >= 3,
  `only ${usable.length} of ${CANDIDATES.length} candidate issues can be characterised at all`);
const [UNIFORM, SPLIT, BOTHWAYS] = usable;

const seeded = [];
let vn = 0;
for (let i = 0; i < 6; i++) seeded.push(vote(vn++, UNIFORM, "yea"));
for (let i = 0; i < 5; i++) seeded.push(vote(vn++, SPLIT, "yea"));
for (let i = 0; i < 3; i++) seeded.push(vote(vn++, SPLIT, "nay"));
for (let i = 0; i < 2; i++) seeded.push(vote(vn++, BOTHWAYS, "yea"));
for (let i = 0; i < 2; i++) seeded.push(vote(vn++, BOTHWAYS, "nay"));
for (const w of [win, bare]) w.PDXVotingRecord.noteMember(MEMBER, seeded.map((v) => ({ ...v })));

function rowsOf(w, pid) {
  const html = w.PDXConsistency.stancesSectionHtml(pid);
  const out = {};
  for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
    if (k) out[k] = chunk;
  }
  return { html, rows: out };
}
const mem = rowsOf(win, MEMBER);
const pres = rowsOf(win, PRES);

// The three clauses have to have actually been written, or sections 2 and 3 would
// be asserting about sentences the engine declined to produce. Read off the
// result rather than the markup: on the rendered face the linkifier has, by
// design, put a control in the middle of each phrase.
const whyOf = (w, pid, key) => {
  const r = w.PDXConsistency.issueRows(pid).filter((x) => x.key === key)[0];
  return r ? String(w.PDXConsistency.rowResult(r).why || "") : "";
};
must(/all 6 advanced it/.test(whyOf(win, MEMBER, UNIFORM)),
  `the uniform-run clause no longer renders on ${MEMBER}/${UNIFORM}`);
must(/advanced it/.test(whyOf(win, MEMBER, SPLIT)) && /cut against it/.test(whyOf(win, MEMBER, SPLIT)),
  `the deep-split clause no longer states both directions on ${MEMBER}/${SPLIT}`);
must(/ran both ways/.test(whyOf(win, MEMBER, BOTHWAYS)),
  `the shallow-split clause no longer renders on ${MEMBER}/${BOTHWAYS}`);
must(!!mem.rows[UNIFORM] && !!mem.rows[SPLIT] && !!mem.rows[BOTHWAYS],
  "the seeded rows are no longer rendered into the stances section");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the words the row prints have definitions, under the keys it asks for");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every phrase in this table is text a reader meets ON a row face. The key is
  // the contract between the row and the glossary: term() renders plain text for
  // an unknown key rather than throwing, so a broken key is silent at runtime and
  // this list is the only thing that would notice.
  const CORE = [
    ["directionmatch", "Direction match"],
    ["publicmatch", "Public-record match"],
    ["notscored", "Not scored yet"],
    ["recorddirection", "advanced it"],
    ["ranbothways", "ran both ways"],
    ["depthcounts", "aligned"],
  ];
  for (const [key, phrase] of CORE) {
    const e = L.get(key);
    ok(!!e, `glossary: no entry for "${key}" — the row prints "${phrase}" and defines it nowhere`);
    if (!e) continue;
    ok(!!e.short, `glossary/${key}: has no one-sentence answer`);
    // "How PolitiDex uses it" is the honesty half of an entry: the civics half
    // explains the concept, this half explains OUR treatment of it. On these six
    // terms our treatment is the entire question a skeptical reader is asking.
    ok(!!e.why, `glossary/${key}: has no "How PolitiDex uses it" note — the product's own choice is undisclosed`);
    ok(e.short.length <= 260, `glossary/${key}: the short answer is not short (${e.short.length})`);
    // The phrase the row prints must be findable from the entry, or a reader who
    // searches the glossary for the words they just read finds nothing.
    const blob = [e.term, ...(e.aka || [])].join(" | ").toLowerCase();
    has(blob, phrase.toLowerCase(),
      `glossary/${key}: the entry cannot be found by the words the row actually prints`);
  }
  // The layer's own invariants still hold with the new entries in place: every
  // category is real, every cross-link resolves, nothing links to itself.
  const self = L.selfTest();
  ok(self.passed, "glossary: selfTest fails — " + self.failures.join(" | "));
  // …and the new terms are reachable from the full glossary sheet, not only from
  // the row, so someone who meets the word elsewhere can still look it up.
  for (const [key] of CORE) {
    ok(L.keys().indexOf(key) !== -1, `glossary: "${key}" is not listed in the glossary itself`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the row face invokes the teaching helper, at the phrase");
// ═════════════════════════════════════════════════════════════════════════════
{
  const termsIn = (chunk) =>
    [...String(chunk).matchAll(/data-pdx-term="([^"]+)"/g)].map((m) => m[1]);

  // A SCORED ROW teaches its metric and its denominator — the two claims it makes.
  const scored = CS.issueRows(PRES).filter((r) => r.scored && r.tested);
  must(scored.length > 3, "the president no longer renders scored rows to check");
  for (const r of scored) {
    const t = termsIn(pres.rows[r.key] || "");
    ok(t.indexOf("directionmatch") !== -1,
      `president/${r.key}: the row prints "Direction match" and offers no definition of it`);
    ok(t.indexOf("depthcounts") !== -1,
      `president/${r.key}: the row prints its aligned/against counts and defines neither`);
    // The control sits on the words themselves, inside the spans that carry them —
    // not in a footer the reader has to go looking for.
    ok(/class="pdxst-metric"><button[^>]*data-pdx-term="directionmatch"/.test(pres.rows[r.key]),
      `president/${r.key}: the metric's definition is not anchored to the metric`);
    ok(/class="pdxst-comp-for"><b>\d+<\/b> <button[^>]*data-pdx-term="depthcounts"/.test(pres.rows[r.key]),
      `president/${r.key}: the denominator's definition is not anchored to the counts`);
  }

  // AN UNSCORED ROW teaches the label that would otherwise read as a dodge, and
  // whatever the record-direction index said about the record.
  for (const key of [UNIFORM, SPLIT, BOTHWAYS]) {
    const t = termsIn(mem.rows[key] || "");
    ok(t.indexOf("notscored") !== -1,
      `${MEMBER}/${key}: an unscored row says "Not scored yet" and never says what that means`);
  }
  for (const key of [UNIFORM, SPLIT]) {
    ok(termsIn(mem.rows[key]).indexOf("recorddirection") !== -1,
      `${MEMBER}/${key}: the row says what the record did and defines neither direction`);
  }
  ok(termsIn(mem.rows[BOTHWAYS]).indexOf("ranbothways") !== -1,
    `${MEMBER}/${BOTHWAYS}: the row says the record ran both ways and does not define it`);
  // The public lane's own metric name is taught by the key that belongs to it, so
  // a public-record row can never borrow the formal metric's definition.
  ok(/publicmatch/.test(CS_SRC) && /res\.metric === 'Public-record match'\) \? 'publicmatch' : 'directionmatch'/.test(CS_SRC),
    "the metric's teaching key no longer follows the lane that produced the number");

  // ONE LESSON PER LINE. The deep-split clause contains BOTH directional phrases
  // ("5 advanced it, 3 cut against it") and they share a single entry, so a second
  // control there would put two dotted words in one clause and teach nothing new.
  const splitChunk = mem.rows[SPLIT] || "";
  eq((splitChunk.match(/data-pdx-term="recorddirection"/g) || []).length, 1,
    `${MEMBER}/${SPLIT}: both halves of one clause were linkified — the row is being turned into a textbook`);
  // …and the row stays scannable: a handful of definitions, not a footnote apparatus.
  for (const [who, chunk] of [["president", pres.rows[scored[0].key]], [MEMBER, splitChunk]]) {
    const n = (String(chunk).match(/class="pdxl-t"/g) || []).length;
    ok(n > 0 && n <= 4, `${who}: ${n} teaching controls on one row — the face stopped being scannable`);
  }

  // WHERE IT MAY NOT RUN. The tooltip and the aria-label are attribute values; a
  // <button> in one of those is printed as literal angle brackets and read aloud
  // as markup. They carry the phrases as plain words, exactly as before.
  const titles = [...splitChunk.matchAll(/title="([^"]*)"/g)].map((m) => m[1]);
  const labels = [...splitChunk.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1]);
  ok(titles.some((t) => /advanced it/.test(t)),
    `${MEMBER}/${SPLIT}: the tooltip no longer carries the clause — the probe below proves nothing`);
  for (const v of [...titles, ...labels]) {
    lacks(v, "<button", "a teaching control leaked into an attribute value");
    lacks(v, "pdxl-t", "teaching markup leaked into an attribute value");
  }
  // The linkifier's rules must stay mutually exclusive: a rule whose phrase could
  // appear inside another rule's rendered button would linkify markup. Checked by
  // running each rule's phrase through the other rule's output.
  const RULES = [...CS_SRC.matchAll(/\{ re: \/\(([^)]+)\)\/, key: '([a-z]+)' \}/g)]
    .map((m) => ({ phrases: m[1].split("|"), key: m[2] }));
  must(RULES.length >= 2, "the row's teaching rules are no longer declared as a readable table");
  for (const a of RULES) {
    for (const b of RULES) {
      if (a === b) continue;
      const rendered = L.term(b.key, b.phrases[0]);
      for (const p of a.phrases) {
        lacks(rendered, p,
          `teaching rule "${a.key}" would match inside rule "${b.key}"'s own markup`);
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the definitions do not contradict the walls they describe");
// ═════════════════════════════════════════════════════════════════════════════
{
  const why = (k) => String((L.get(k) || {}).why || "");
  const all = (k) => { const e = L.get(k) || {}; return [e.short, e.long || "", e.why || ""].join(" "); };

  // SAID-VS-DID, ONE ISSUE, FORMAL ONLY. Three claims the copy makes about
  // Direction match, each of which the row's own behaviour has to back.
  has(why("directionmatch"), "ONE issue",
    "directionmatch: the copy does not say the number is scoped to one issue");
  has(why("directionmatch"), "Word vs Action",
    "directionmatch: the copy does not point at where the profile's one score lives");
  ok(/formal record/i.test(all("directionmatch")),
    "directionmatch: the copy does not say the number is built from the formal record only");
  // …and the row agrees: the metric name follows the basis, every time.
  for (const pid of [PRES, MEMBER]) {
    for (const r of win.PDXConsistency.issueRows(pid)) {
      const res = win.PDXConsistency.rowResult(r);
      if (!res.metric) continue;
      eq(res.metric, r.verdict.basis === "public_record" ? "Public-record match" : "Direction match",
        `${pid}/${r.key}: the metric name does not follow the record that produced it`);
    }
  }
  // THE PUBLIC LANE IS SEPARATE, and the copy for the public metric says so
  // rather than describing itself as a kind of Direction match.
  ok(/never pooled|separate lane/i.test(why("publicmatch")),
    "publicmatch: the copy does not state that the public lane stays out of Direction match");
  has(win.PDXConsistency.stancesSectionHtml(PRES), "Not in Direction Match",
    "the row stopped disclosing that the public lane is outside Direction Match");

  // RECORD-DIRECTION IS NOT A STANCE. The copy says it describes the record and
  // is never attributed as a position; the rows it appears on must therefore be
  // unscored, unranked, and carry no percentage.
  ok(/never a position|not a position/i.test(why("recorddirection")),
    "recorddirection: the copy does not refuse to read a direction as a position they hold");
  has(why("recorddirection"), "not an input",
    "recorddirection: the copy does not say the direction stays out of Direction match");
  for (const key of [UNIFORM, SPLIT, BOTHWAYS]) {
    const r = win.PDXConsistency.issueRows(MEMBER).filter((x) => x.key === key)[0];
    must(!!r, `${MEMBER}/${key} left the row model`);
    const res = win.PDXConsistency.rowResult(r);
    eq(res.pct, null, `${MEMBER}/${key}: a record-direction row acquired a percentage`);
    eq(r.verdict.score, null, `${MEMBER}/${key}: a record-direction row acquired a score`);
    eq(r.tested, false, `${MEMBER}/${key}: a record-direction row is being treated as tested`);
    eq(r.said, false, `${MEMBER}/${key}: the fixture row gained a stated position`);
    ok(!/class="pdxst-pct"[^>]*>\d+%/.test(mem.rows[key]),
      `${MEMBER}/${key}: a percentage was printed beside a description of the record`);
  }
  // RAN BOTH WAYS NAMES NO WINNER. The copy says no lean is worded; the index
  // must therefore leave `lead` unset on exactly those rows.
  ok(/no lean|neither side/i.test(all("ranbothways")),
    "ranbothways: the copy does not say a split record names no direction");
  const idx = win._pdxRecordDirection(MEMBER, BOTHWAYS, { noun: { one: "vote", many: "votes" } });
  must(!!idx && /split/.test(idx.token), `${BOTHWAYS} is no longer classified as a split record`);
  eq(idx.lead, null, "ranbothways: the index named a direction on a record that ran both ways");
  eq(idx.characterised, false, "ranbothways: a split record is being reported as characterised");

  // THE DENOMINATOR IS DEPTH, NOT A SECOND SCORE. The copy says the counts come
  // from the same tally the percentage divides, so the two can never disagree.
  ok(/not a second score|Depth, not/i.test(why("depthcounts")),
    "depthcounts: the copy does not say the counts are depth rather than a second score");
  for (const r of CS.issueRows(PRES).filter((x) => x.scored && x.tested)) {
    const chunk = pres.rows[r.key] || "";
    const a = Number((chunk.match(/pdxst-comp-for"><b>(\d+)<\/b>/) || [])[1]);
    const x = Number((chunk.match(/pdxst-comp-against"><b>(\d+)<\/b>/) || [])[1]);
    eq(Math.round((100 * a) / (a + x)), r.verdict.score,
      `president/${r.key}: the taught denominator does not reconstruct the row's own percentage`);
  }

  // "NOT SCORED YET" IS ABOUT OUR COVERAGE, not a finding about the person — the
  // one thing that label most easily reads as, and the reason it needed teaching.
  ok(/not because the record is empty|not as a finding about the person/i.test(all("notscored")),
    "notscored: the copy does not separate our documentation gap from their conduct");
  has(all("notscored"), "inventory",
    "notscored: the copy does not say the count beside an unscored row is inventory, not a rate");

  // NO PARTY FRAMING anywhere in the new vocabulary. The product does not score
  // anyone against their party and its definitions must not imply that it does.
  const PARTY = /\b(party[- ]?(loyal|loyalty|line|discipline)|toes the line|with (his|her|their) party)\b/i;
  for (const k of ["directionmatch", "publicmatch", "notscored", "recorddirection",
                   "ranbothways", "depthcounts"]) {
    ok(!PARTY.test(all(k)), `glossary/${k}: the definition frames the record against a party`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · teaching cannot move a number");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The same profiles, rendered in two realms: one with the education layer, one
  // without it. Every row result must be identical in both. This is the whole
  // safety argument for wiring definitions into the row face — if a definition
  // can change what a row concluded, it is not a definition.
  for (const pid of [PRES, MEMBER]) {
    const a = win.PDXConsistency.issueRows(pid);
    const b = bare.PDXConsistency.issueRows(pid);
    eq(a.length, b.length, `${pid}: the education layer changed how many rows exist`);
    for (let i = 0; i < a.length; i++) {
      const ra = win.PDXConsistency.rowResult(a[i]);
      const rb = bare.PDXConsistency.rowResult(b[i]);
      const strip = (r, res) => JSON.stringify({
        key: r.key, tested: r.tested, scored: r.scored, token: r.verdict.token,
        score: r.verdict.score, basis: r.verdict.basis,
        state: res.state, pct: res.pct, metric: res.metric, label: res.label,
        shape: res.shape, held: res.held, why: res.why,
      });
      eq(strip(a[i], ra), strip(b[i], rb),
        `${pid}/${a[i].key}: the row's result differs depending on whether definitions are loaded`);
    }
    // …and on the rendered face: the same percentages, in the same order.
    const pcts = (h) => (String(h).match(/class="pdxst-pct"[^>]*>(\d+)%/g) || []).join("|");
    eq(pcts(win.PDXConsistency.stancesSectionHtml(pid)),
       pcts(bare.PDXConsistency.stancesSectionHtml(pid)),
      `${pid}: the printed percentages change when the education layer loads`);
  }
  // The layer is optional by construction: with PDXLearn absent every call site
  // degrades to the plain escaped word it printed before, and no control is drawn.
  const bareMem = rowsOf(bare, MEMBER);
  lacks(bareMem.rows[SPLIT], "pdxl-t", "the row draws teaching markup with no education layer loaded");
  has(bareMem.rows[SPLIT], "advanced it", "…and loses the words themselves when it degrades");
  has(bareMem.rows[SPLIT], "Not scored yet", "…and loses its label when it degrades");
  const barePres = rowsOf(bare, PRES);
  const anyScored = CS.issueRows(PRES).filter((r) => r.scored && r.tested)[0];
  has(barePres.rows[anyScored.key], "Direction match",
    "the metric name vanishes when the education layer is absent");
  has(barePres.rows[anyScored.key], "</b> aligned</span>",
    "the denominator's noun vanishes when the education layer is absent");

  // Nothing in the teaching path may reach the scoring path. The linkifier runs
  // on rendered text; the term helper is presentation. Neither may see a verdict.
  const teachAt = CS_SRC.indexOf("function _stTeach");
  must(teachAt > 0, "the row's teaching linkifier (_stTeach) has been renamed away");
  const teach = CS_SRC.slice(teachAt, CS_SRC.indexOf("\n  function ", teachAt + 10));
  lacks(teach, "verdict", "the teaching linkifier reads a verdict");
  lacks(teach, "score", "the teaching linkifier reads a score");
  lacks(teach, "rowResult", "the teaching linkifier reaches into the scoring path");
}

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ row vocabulary: ${failures.length} failure(s) (${passed} passed)\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ row vocabulary: all ${passed} assertions passed — the row teaches the words the row prints`);
