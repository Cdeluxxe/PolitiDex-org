#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vehicle-families.mjs — naming more of the vehicles, and proving that
// naming them still cannot move a single number
// ─────────────────────────────────────────────────────────────────────────────
// The light classifier in stance-helpers.js turns a bill title into a family word
// so a surface can say "inside H.R. 4, a rescissions act" instead of "inside
// H.R. 4". Phase 2 widened the fixed list beyond the must-pass appropriations
// families it shipped with — amendments, rescissions acts, debt-limit acts and
// resolutions of disapproval are all instruments a reader cannot identify from a
// number alone — and opened a registration call so the next family does not
// require editing the array by hand.
//
// Widening a list of WORDS is the cheapest possible way to accidentally ship a
// grade, so the fence is most of this file:
//
//   1. THE NEW FAMILIES READ REAL TITLES. Every family asserted here is matched
//      against a title the shipped corpus actually carries, not a fixture written
//      to make the regex pass.
//   2. UNRECOGNISED STAYS SILENT. An ordinary standalone policy bill classifies as
//      `null`. `null` means "we do not classify this" and must never be printed as
//      "this was an ordinary bill".
//   3. NO INTENT, NO VERDICT, NO NUMBER — in any label, builtin or registered.
//      A family is a kind of document. A kind of document is not a measurement.
//   4. REGISTRATION CANNOT UNNAME. A registered family lands behind the specific
//      builtins and ahead of the generic catch-all, which is the only position
//      that cannot change an existing classification.
//   5. NOTHING MOVED. With a family registered that matches every title in the
//      corpus, Direction Match, the formal pattern tiers, the per-issue counts and
//      every field of the vehicle tally are byte-identical to the unregistered run.
//   6. NO PERCENTAGE IN THE COPY. Counts and named bills. A percentage is the
//      exact shape that invites a league table.
//
//   node scripts/test-vehicle-families.mjs
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
  "profile-spine.js", "profiles-full.js",
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
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vehicle-families: ${msg}`);
  process.exit(1);
};

const W = boot();
must(typeof W._rdVehicleClass === "function", "_rdVehicleClass is not exposed");
must(W.PDXVehicleFamilies && typeof W.PDXVehicleFamilies.register === "function",
  "PDXVehicleFamilies.register is not exposed");
const FAM = W.PDXVehicleFamilies;
const { byMember, measures } = buildCorpus(ROOT);
must(measures.size > 60, `the offline corpus is too small to census (${measures.size})`);

// Every instrument in the corpus, classified by the shipped classifier.
const CORPUS = [...measures.values()].map((m) => ({
  number: m.number, title: m.title, issues: m.issues || [],
  cls: W._rdVehicleClass(m.title, m.number),
}));
const findCls = (re) => CORPUS.filter((m) => re.test(m.number + " " + m.title));

// ── 1 · the new families read titles the corpus actually carries ─────────────
{
  section("1 · the four new families, matched against real corpus titles");

  // key → a regex that finds the real instrument, and how many the corpus holds.
  const CASES = [
    ["amendment", /^[HS]\.Amdt\./, 20],
    ["disapproval", /congressional disapproval|disapproving the rule submitted by/i, 8],
    ["rescissions", /Rescissions Act/i, 1],
    ["debt_limit", /Fiscal Responsibility Act/i, 1],
  ];
  for (const [key, re, min] of CASES) {
    const found = findCls(re);
    ok(found.length >= min,
      `${key}: corpus carries at least ${min} matching instruments (found ${found.length})`);
    const wrong = found.filter((m) => !m.cls || m.cls.key !== key);
    eq(wrong.length, 0, `${key}: every one of them classifies as ${key}` +
      (wrong.length ? ` — first miss: ${wrong[0].number} → ${wrong[0].cls ? wrong[0].cls.key : "null"}` : ""));
  }

  // The instrument designator, not the word "amendment" in a bill's own name.
  eq(FAM.classify("Privacy Amendment Act of 2025", "H.R. 9001"), null,
    "a bill whose NAME contains 'Amendment' is not an amendment instrument");
  eq((FAM.classify("H.Amdt. 266 (Grothman)", "H.Amdt. 266") || {}).key, "amendment",
    "…while an H.Amdt. designator is");
  eq((FAM.classify("S.Amdt. 1354 Kennedy amendment prohibiting VA reporting", "S.Amdt. 1354") || {}).key,
    "amendment", "…and so is an S.Amdt.");

  // An amendment offered to a defence authorization is an AMENDMENT: the
  // designator is definitive and beats a family word borrowed from the parent.
  eq((FAM.classify("H.Amdt. 412 to the National Defense Authorization Act", "H.Amdt. 412") || {}).key,
    "amendment", "the designator is tested before a parent's family word");

  // Both disapproval flavours the corpus carries, under one honest label.
  eq((FAM.classify("Providing for congressional disapproval of the ATF rule", "H.J.Res. 44") || {}).key,
    "disapproval", "a Congressional Review Act rule disapproval");
  eq((FAM.classify("A joint resolution providing for congressional disapproval of the proposed foreign military sale", "S.J.Res. 33") || {}).key,
    "disapproval", "…and an arms-sale disapproval, same family, no CRA claim");
}

// ── 2 · unrecognised is the default, and it stays silent ─────────────────────
{
  section("2 · ordinary standalone policy bills are not classified");

  // Named because they are the population the widening could have swept up: real
  // corpus bills that carry a narrow secondary mapping and are still just bills.
  const PLAIN = [
    "HALT Fentanyl Act", "Respect for Marriage Act", "Chips and Science Act",
    "Protecting Privacy in Purchases Act", "Secure America Act", "Laken Riley Act",
    "Bipartisan Safer Communities Act", "Postal Service Reform Act of 2022",
  ];
  for (const title of PLAIN) {
    const m = CORPUS.find((x) => x.title === title);
    ok(m, `the corpus still carries "${title}"`);
    if (m) eq(m.cls, null, `"${title}" classifies as null, not as a family`);
  }
  eq(FAM.classify("", ""), null, "an empty title classifies as null rather than throwing");
  eq(FAM.classify(null, null), null, "…and so does no title at all");

  // Silence is the majority answer, and that is the point: the list recognises
  // instrument kinds, it does not label everything.
  const unnamed = CORPUS.filter((m) => !m.cls).length;
  ok(unnamed > 20, `most of the corpus stays unnamed (${unnamed} of ${CORPUS.length})`);
}

// ── 3 · what a label is allowed to say ──────────────────────────────────────
{
  section("3 · no label carries intent, a verdict or a number");

  const BANNED = /snuck|sneak|buried|hidden|slipped|crammed|rammed|shady|corrupt|dodge|shelved|killed|republican|democrat|gop|partisan|score|grade|%|\d/i;
  const list = FAM.list();
  ok(list.length >= 11, `the list ships at least 11 families (${list.length})`);
  for (const c of list) {
    ok(!BANNED.test(c.label), `"${c.label}" carries no intent, verdict, party or number`);
    ok(/^(a|an|the)\s/i.test(c.label),
      `"${c.label}" is a noun phrase with its article — the shipped sentence is "That is <label>."`);
    // Branded, not `instanceof`: the sandbox is its own realm.
    ok(Object.prototype.toString.call(c.re) === "[object RegExp]",
      `${c.key} is matched by a RegExp over the shipped title`);
  }
  eq(FAM.scored, false, "the lane declares itself unscored");
  const never = FAM.NEVER_FEEDS || [];
  for (const k of ["directionMatch", "formalPatternTier", "ballotSort", "anyPercentage"]) {
    ok(never.indexOf(k) >= 0, `NEVER_FEEDS names ${k}`);
  }

  // The published list is a copy: holding it cannot reorder match order.
  const before = FAM.list().map((c) => c.key).join(",");
  const grab = FAM.list();
  grab.reverse();
  grab[0].label = "a corrupt bargain";
  eq(FAM.list().map((c) => c.key).join(","), before,
    "reversing and rewriting the returned list changes nothing");
  eq(FAM.list().filter((c) => /corrupt/.test(c.label)).length, 0,
    "…and cannot inject a label through it");
}

// ── 4 · the registration contract ───────────────────────────────────────────
{
  section("4 · register() refuses what it must, and lands where it must");

  const w = boot();
  const F = w.PDXVehicleFamilies;
  const REFUSALS = [
    [null, "no family at all"],
    [{ label: "a farm bill", re: /farm bill/i }, "a family with no key"],
    [{ key: "Farm Bill", label: "a farm bill", re: /farm bill/i }, "a key that is not a slug"],
    [{ key: "omnibus", label: "another omnibus", re: /x/ }, "a key that shadows a builtin"],
    [{ key: "farm", label: "a farm bill", re: "farm bill" }, "a string where a RegExp belongs"],
    [{ key: "farm", label: "a bill they snuck through", re: /farm/i }, "a label carrying intent"],
    [{ key: "farm", label: "a 60% package", re: /farm/i }, "a label carrying a number"],
    [{ key: "farm", label: "ab", re: /farm/i }, "a label too short to be a noun phrase"],
  ];
  for (const [fam, why] of REFUSALS) {
    const r = F.register(fam);
    ok(r && r.ok === false, `refused: ${why}`);
    ok(r && typeof r.why === "string" && r.why.length > 3, `…and said why (${why})`);
  }
  const keysAfterRefusals = F.list().map((c) => c.key).join(",");
  eq(keysAfterRefusals, FAM.list().map((c) => c.key).join(","),
    "eight refusals left the list exactly as it was");

  const good = F.register({ key: "wrda", label: "a water resources development act",
    re: /water resources development act/i });
  ok(good && good.ok === true, "accepted: a well-formed family");
  eq((F.classify("Water Resources Development Act of 2024", "S. 4367") || {}).key, "wrda",
    "…and it classifies from that moment on");
  const keys = F.list().map((c) => c.key);
  const generics = F.list().map((c) => !!c.generic);
  ok(keys.indexOf("wrda") < generics.lastIndexOf(true),
    "…spliced AHEAD of the generic catch-all, so a specific title reaches it");
  ok(keys.indexOf("wrda") > keys.indexOf("omnibus"),
    "…and BEHIND every specific builtin, so it cannot outrank one");
  eq(F.register({ key: "wrda", label: "a second one", re: /x/ }).ok, false,
    "a second registration under a live key is refused, not silently shadowed");

  // The one thing registration must never do: rename a vehicle a SPECIFIC family
  // already named. Same titles, same answers, in a sandbox that now carries an
  // extra family AND one that greedily matches everything.
  F.register({ key: "greedy", label: "an instrument of some kind", re: /./ });
  const GENERIC = new Set(FAM.list().filter((c) => c.generic).map((c) => c.key));
  let superseded = 0;
  for (const m of CORPUS) {
    if (!m.cls) continue;
    const now = F.classify(m.title, m.number);
    if (GENERIC.has(m.cls.key)) {
      // A generic catch-all IS supersedable, and that is the whole reason
      // registration exists: a title that only ever reached "an appropriations
      // act" can now be recognised as the thing it actually is.
      superseded++;
      ok(now && (now.key === m.cls.key || now.key === "greedy"),
        `${m.number} was only ever caught by a generic (${m.cls.key}) and stays classified`);
    } else {
      eq(now && now.key, m.cls.key, `${m.number} is still ${m.cls.key}`);
    }
  }
  ok(superseded >= 1, `at least one corpus title sat on a generic catch-all (${superseded})`);
  const greedied = CORPUS.filter((m) => !m.cls)
    .filter((m) => { const c = F.classify(m.title, m.number); return c && c.key === "greedy"; });
  ok(greedied.length > 10,
    `…and the greedy family otherwise only picks up what nothing named (${greedied.length})`);
}

// ── 5 · nothing moved ───────────────────────────────────────────────────────
{
  section("5 · a registered family cannot move DM, a tier, a count or a share");

  // The member with the deepest real record in the offline corpus, so the
  // snapshot has tiers to compare rather than a thin file.
  const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  const [PID, items] = ranked[0];
  must(items.length > 40, `the deepest corpus member is too thin (${PID}: ${items.length})`);

  // Everything a family word is forbidden from touching, read off the shipped
  // engines and flattened to one comparable string.
  const snapshot = (w) => {
    w.PDXVotingRecord.noteMember(PID, items);
    const out = [];
    const wa = w.PDXWordAction.read(PID, w.CMP_DATA[PID]);
    out.push(["dm", wa && wa.pct, wa && wa.token, wa && wa.verdict, wa && wa.publishable,
      wa && wa.tested && wa.tested.length, wa && wa.untested && wa.untested.length,
      JSON.stringify((wa && wa.counts) || null), JSON.stringify((wa && wa.tiers) || null),
      JSON.stringify((wa && wa.floors) || null)].join("|"));
    const rows = (w.PDXConsistency.formalPatternIndex.rows(PID) || []).map((r) =>
      [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
    out.push(["tiers", rows.length, rows.join(",")].join("|"));
    const keys = Object.keys(w.ISSUE_MAP);
    for (const k of keys) {
      const v = w._recordVehicleStats(k, items, {});
      if (!v || !v.total) continue;
      // Every number the tally publishes — but NOT `classes`, which is the field
      // a family is allowed to change.
      out.push(["veh", k, v.total, v.provision, v.standalone, v.share, v.stowaway,
        v.only, v.threshold, v.vehicles.join("+"), v.sole].join("|"));
      const s = w._pdxRecordIssueSummary ? w._pdxRecordIssueSummary(PID, k) : null;
      if (s) out.push(["sum", k, JSON.stringify(s)].join("|"));
    }
    return out.join("\n");
  };

  const plain = boot();
  const before = snapshot(plain);
  ok(before.length > 400, `the snapshot has something in it (${before.length} chars, ${PID})`);
  ok(before.indexOf("\nveh|") > 0, "…including at least one vehicle tally");

  const loaded = boot();
  const F2 = loaded.PDXVehicleFamilies;
  // Three families at once: one real, one that matches every title in the corpus,
  // and one that claims to be a gate — the maximum a registration can be.
  eq(F2.register({ key: "wrda", label: "a water resources development act",
    re: /water resources development act/i }).ok, true, "registered a real family");
  eq(F2.register({ key: "greedy", label: "an instrument of some kind", re: /./ }).ok, true,
    "registered a family that matches everything");
  eq(F2.register({ key: "gatey", label: "a procedural step", re: /passage|consideration/i,
    gate: true }).ok, true, "registered a family that calls itself a gate");
  const after = snapshot(loaded);
  eq(after, before,
    "Direction Match, the formal tiers, the issue summaries and every vehicle count are identical");

  // …and the family word DID land, so the comparison above is not vacuous.
  const named = Object.keys(loaded.ISSUE_MAP)
    .map((k) => loaded._recordVehicleStats(k, items, {}))
    .filter((v) => v && v.classes && v.classes.indexOf("greedy") >= 0);
  ok(named.length > 0,
    `the greedy family reached at least one vehicle tally's classes (${named.length})`);
}

// ── 6 · the copy stays counts-and-names ─────────────────────────────────────
{
  section("6 · no percentage, no intent, in anything a reader sees");

  const w = boot();
  const V = w.PDXConsistency.vehicle;
  must(V && typeof V.line === "function", "PDXConsistency.vehicle is not exposed");
  const stats = {
    issueKey: "k", total: 4, provision: 3, standalone: 1,
    vehicles: ["H.R. 4", "H.Amdt. 266"], titles: ["Rescissions Act of 2025", "H.Amdt. 266"],
    sole: null, soleTitle: null, classes: ["rescissions", "amendment"],
    major: true, gate: false, share: 0.75, stowaway: true, only: false, threshold: 0.6,
  };
  const say = w.PDXConsistency.menu.kindSay(stats);
  const note = [say, w.PDXConsistency.menu.kinds(stats)].join(" ");
  ok(note.indexOf("a rescissions act") >= 0, "the new labels reach the shipped sentence");
  ok(note.indexOf("an amendment to a larger measure") >= 0, "…both of them");
  eq(/%|\b\d+(\.\d+)?\s*(percent|per cent)\b/.test(note), false,
    "…and the sentence carries no percentage");
  eq(/snuck|buried|hidden|slipped|dodge|corrupt/i.test(note), false,
    "…and no intent language");
  ok(say.indexOf("Those include") >= 0 || say.indexOf("That is") >= 0,
    "…and it is still the shipped verb, chosen by count");

  // The classifier is read by presentation only. No scoring module reads a class.
  const READERS = FILES.filter((f) => /_rdVehicleClass|\.classes\b/.test(R(f)));
  for (const f of READERS) {
    ok(/^(stance-helpers|consistency)\.js$/.test(f),
      `only presentation reads a vehicle class — ${f} must not`);
  }
  const wa = R("word-action.js");
  eq(/_rdVehicleClass|PDXVehicleFamilies|\.classes\b/.test(wa), false,
    "word-action.js (Direction Match) does not read the classifier at all");
  const pf = R("publication-floor.js");
  eq(/_rdVehicleClass|PDXVehicleFamilies|vehicle/i.test(pf), false,
    "publication-floor.js does not read the classifier at all");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ vehicle-families: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
const named = CORPUS.filter((m) => m.cls).length;
console.log(`✓ vehicle-families: all ${passed} assertions passed`);
console.log(`   corpus: ${named} of ${CORPUS.length} instruments named` +
  ` · ${FAM.list().length} families · ${CORPUS.length - named} left silent`);
