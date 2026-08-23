#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Glossary honesty harness — does the education layer still describe the code?
// ─────────────────────────────────────────────────────────────────────────────
// pdx-learn.js explains, in plain language, rules that live as constants in the
// scoring engine: the procedural down-weight, the recommit/table Yea inversion,
// the thin-data thresholds, and the Official-Record ÷ Say-vs-Do boundary. That
// copy is stated with confidence and carries a "How PolitiDex uses it" line, so
// if a constant moves and the copy does not, the product starts teaching a
// falsehood *authoritatively* — the worst failure mode an explainer has. Nothing
// else in the suite would notice: the engine tests assert on verdicts, and the
// education tests assert on markup. Neither reads the prose.
//
// So this harness does not check that the copy is well written. It checks that
// the copy is TRUE, by observing what the real code actually does and asserting
// the words match:
//
//   1. procedural down-weight   ← probes stance-helpers.js  _issueRecordSummary
//   2. Yea-inversion list       ← imports vr-pack.ts        yeaBlocksMeasure
//   3. thin-data thresholds     ← probes consistency.js     saydoScore
//   4. two-scope boundary       ← probes consistency.js     isSaydoReceipt
//
// Every contract is BEHAVIOURAL where the code is reachable: the thresholds are
// derived by sweeping the real functions, not read from a literal, so renaming a
// constant cannot cause a false pass. Contract 2 additionally reads the trigger
// strings out of yeaBlocksMeasure's source, because behaviour alone can confirm
// that documented phrases invert but can never discover an inversion nobody
// documented. Both directions are asserted:
//     every phrase the code inverts  → some glossary entry says so
//     every glossary entry that claims inversion → the code really inverts it
//
//   node scripts/test-glossary-honesty.mjs
//
// A failure here means one of two things, and the message says which: the copy
// needs updating to match a deliberate code change, or a code change was not
// deliberate. Either way it must not ship silently. No DB, no network.
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);

// A stale harness is itself a failure — if a probe target has been renamed away,
// say so loudly rather than skipping the contract and reporting green.
function must(cond, what) {
  if (!cond) {
    console.error(
      "✗ glossary-honesty harness is STALE — cannot verify a contract:\n  " + what +
      "\n\n  This is not a passing state. Either restore the probe target, or update\n" +
      "  this harness AND re-check the glossary copy that describes it."
    );
    process.exit(2);
  }
}

// ── Load the education layer (DOM-less; the glossary is pure data) ─────────────
function loadLearn() {
  const noopEl = () => ({ style: {}, textContent: "", setAttribute() {}, appendChild() {} });
  const ctx = {
    console, JSON, Math, String, Array, Object, RegExp, setTimeout, clearTimeout,
    document: {
      readyState: "complete", head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(read("pdx-learn.js"), vm.createContext(ctx), { filename: "pdx-learn.js" });
  must(ctx.window.PDXLearn && typeof ctx.window.PDXLearn.get === "function",
    "pdx-learn.js no longer exposes window.PDXLearn.get()");
  return ctx.window.PDXLearn;
}
const L = loadLearn();

// All the prose of one glossary entry, lowercased, as one searchable string.
function copyOf(key) {
  const e = L.get(key);
  must(e, `glossary entry "${key}" no longer exists — the copy it held described a live scoring rule`);
  return [e.short, e.long, e.why].filter(Boolean).join(" ").toLowerCase();
}
const has = (hay, needle) => hay.indexOf(String(needle).toLowerCase()) !== -1;

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1 — the procedural down-weight
//   Code:     stance-helpers.js  `w *= _RECORD_PROCEDURAL_FACTOR`
//   Claim:    "counts procedural votes at a quarter of the weight"
// Derived by observation: score one procedural record whose issue mapping weighs
// 100 and read the weighted score back out. No constant name is referenced, so a
// rename cannot fake a pass — only the real arithmetic can.
// ═════════════════════════════════════════════════════════════════════════════
{
  const noopEl = () => ({ style: {}, textContent: "", setAttribute() {}, appendChild() {} });
  const ctx = {
    console, JSON, Math, Date, setTimeout, clearTimeout,
    document: {
      readyState: "complete", head: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(read("stance-helpers.js"), vm.createContext(ctx), { filename: "stance-helpers.js" });

  const summary = ctx.window._issueRecordSummary;
  must(typeof summary === "function",
    "stance-helpers.js no longer exports _issueRecordSummary — the procedural weight is unprobeable");

  // One consistent record, issue weight 100. Substantive vs procedural.
  const rec = (isProcedural) => ({
    kind: "vote", position: "yea", isProcedural: isProcedural,
    issues: [{ issueKey: "x", weight: 100, supportMeaning: "yea_supports" }],
  });
  const sub = summary("x", "support", [rec(false)]);
  const proc = summary("x", "support", [rec(true)]);
  must(sub.consistentScore > 0 && proc.consistentScore > 0,
    "probe produced no weighted score — the record fixture no longer matches the engine's expected item shape");

  const factor = proc.consistentScore / sub.consistentScore;

  // The copy states the weight as an English fraction, so the harness must know
  // the word for whatever the code now uses. An unmapped factor is a stale-harness
  // condition, not a pass: it means the copy cannot be verified either way.
  const FRACTION_WORDS = {
    0.5: "half", 0.4: "two fifths", "0.3333": "a third", 0.25: "a quarter",
    0.2: "a fifth", 0.125: "an eighth", 0.1: "a tenth",
  };
  const key = FRACTION_WORDS[factor] !== undefined ? factor : Number(factor.toFixed(4)).toString();
  const word = FRACTION_WORDS[key];
  must(word,
    `procedural votes are now weighted at ${factor}× and this harness has no English phrasing for that.\n` +
    "  Add it to FRACTION_WORDS, then update every explainer that says the old fraction:\n" +
    "    pdx-learn.js  → GLOSSARY.procedural.why, GLOSSARY.previousquestion.why\n" +
    "    consistency.js → methodologyHtml() '⚙️ Why some votes count less' row\n" +
    "    voting-record.js → procTeachHtml()");

  ok(factor > 0 && factor < 1,
    `procedural votes should be down-weighted but not erased (observed factor ${factor})`);

  // The glossary must state the observed fraction — and must not state a different one.
  const others = Object.values(FRACTION_WORDS).filter((w) => w !== word);
  for (const k of ["procedural", "previousquestion"]) {
    const copy = copyOf(k);
    ok(has(copy, word),
      `DRIFT: procedural weight is ${factor}× ("${word}") but GLOSSARY.${k} never says "${word}".\n` +
      `    The code changed and the explainer did not — it is now teaching the old rule.`);
    const stale = others.filter((w) => has(copy, w));
    ok(stale.length === 0,
      `DRIFT: GLOSSARY.${k} still mentions "${stale.join('", "')}" while the real weight is ${factor}× ("${word}").`);
  }

  // The same number is stated on two product surfaces. Both must agree with the code.
  //
  // Read the SHEET, not the whole file. consistency.js also holds _DOS_MECH, the
  // curated prose describing what several hundred measures did — and ordinary
  // English about a bill ("the precision half of the same air campaign", "a third of
  // the account") collides with the fraction vocabulary below. Grepping the file
  // entire reported drift in the methodology copy whenever a curator wrote a
  // fraction into a bill description, which is a false alarm pointing at the wrong
  // place. Scoping to methodologyHtml() is what this block always claimed to check
  // and is stricter, not looser: a stale fraction anywhere in the sheet still fails.
  const consSrc = read("consistency.js");
  const sheet = (consSrc.match(/function methodologyHtml\(pid\) \{[\s\S]*?\n  \}\n/) || [""])[0];
  must(sheet && sheet.indexOf("Why some votes count less") !== -1,
    "methodologyHtml() could not be isolated from consistency.js — the procedural-weight copy is unprobeable");
  const surfaces = [
    ["consistency.js", "methodology sheet", sheet],
    ["voting-record.js", "procedural teaching note", read("voting-record.js")],
  ];
  for (const [file, where, src] of surfaces) {
    ok(src.toLowerCase().indexOf(word) !== -1,
      `DRIFT: ${file} (${where}) does not state the real procedural weight "${word}" (${factor}×).`);
    const stale = others.filter((w) => src.toLowerCase().indexOf(w) !== -1);
    ok(stale.length === 0,
      `DRIFT: ${file} still says "${stale.join('", "')}" but the real procedural weight is "${word}" (${factor}×).`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 2 — the Yea-inversion list
//   Code:  netlify/lib/vr-pack.ts  yeaBlocksMeasure()
//   Claim: recommit / table invert a Yea; nothing else the glossary covers does.
// This is the contract most worth guarding: getting the direction wrong does not
// weaken a verdict, it reverses it, and the glossary promises we handle it.
// ═════════════════════════════════════════════════════════════════════════════
{
  // Bundled as CJS, not ESM: vr-pack.ts reaches the DB layer, which pulls in `pg`,
  // and `pg` uses dynamic require() — legal in CJS, fatal in an ESM bundle. Nothing
  // here touches the database (yeaBlocksMeasure is pure), we just need the module to
  // finish loading so the real exported function can be probed.
  const outFile = join(mkdtempSync(join(tmpdir(), "glossary-honesty-")), "vr-pack.cjs");
  execFileSync(
    join(ROOT, "node_modules/.bin/esbuild"),
    [join(ROOT, "netlify/lib/vr-pack.ts"), "--bundle", "--platform=node", "--format=cjs",
      `--outfile=${outFile}`],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  const P = createRequire(import.meta.url)(outFile);
  const inverts = P.yeaBlocksMeasure;
  must(typeof inverts === "function",
    "netlify/lib/vr-pack.ts no longer exports yeaBlocksMeasure — the inversion rule is unprobeable");

  // The authoritative trigger list, read out of the function's own source. Pull the
  // function body first so an indexOf() elsewhere in the file can't leak in.
  const src = read("netlify/lib/vr-pack.ts");
  const body = src.slice(src.indexOf("export function yeaBlocksMeasure"));
  const fnBody = body.slice(0, body.indexOf("\n}"));
  const triggers = [...fnBody.matchAll(/indexOf\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((m) => m[1]);
  must(triggers.length > 0,
    "cannot read the trigger phrases out of yeaBlocksMeasure — it was rewritten in a form this\n" +
    "  harness does not understand (regex? a Set? a table?). Re-derive the list here, then confirm\n" +
    "  every inverting phrase is documented in pdx-learn.js.");

  // Sanity: a plain passage question must NOT invert, or the whole engine is backwards.
  eq(inverts("On passage of the bill"), false, "inversion: plain final passage does not invert");
  eq(inverts(""), false, "inversion: an empty question does not invert");
  eq(inverts(null), false, "inversion: a missing question does not invert");

  // Direction A — everything the code inverts must be documented somewhere.
  // Add `|| q.indexOf("previous question") !== -1` and this fails until the
  // previousquestion entry actually describes the inversion.
  const INVERSION_WORDS = ["invert", "against", "block", "kill", "stop"];
  for (const phrase of triggers) {
    eq(inverts("Motion " + phrase + " the measure"), true,
      `inversion: source lists "${phrase}" as a trigger, so it must invert`);

    const documented = L.keys().filter((k) => {
      const e = L.get(k);
      const names = [e.term, ...(e.aka || [])].join(" ").toLowerCase();
      const needle = phrase.toLowerCase().replace(/^to\s+/, "");
      if (names.indexOf(needle) === -1) return false;
      return INVERSION_WORDS.some((w) => has(copyOf(k), w));
    });
    ok(documented.length > 0,
      `UNDOCUMENTED INVERSION: yeaBlocksMeasure() flips the meaning of a Yea on "${phrase}",\n` +
      `    but no glossary entry both names that phrase and explains the flip. A voter reading\n` +
      `    PolitiDex would see a Yea scored as opposition with no explanation available.\n` +
      `    Add or amend an entry in pdx-learn.js (see GLOSSARY.recommit for the pattern).`);
  }

  // Direction B — everything the glossary claims inverts must really invert.
  // These entries promise the reader we flip the reading; if the code stopped,
  // the promise is false and verdicts on those roll calls are backwards.
  const CLAIMS_INVERSION = { recommit: "recommit", table: "to table" };
  for (const [key, phrase] of Object.entries(CLAIMS_INVERSION)) {
    const copy = copyOf(key);
    ok(INVERSION_WORDS.some((w) => has(copy, w)),
      `GLOSSARY.${key} is expected to explain the Yea inversion and no longer does`);
    eq(inverts("On motion " + phrase), true,
      `BROKEN PROMISE: GLOSSARY.${key} tells the reader a Yea here is a vote against the measure,\n` +
      `    but yeaBlocksMeasure("${phrase}") is false — the code no longer inverts it, so the\n` +
      `    verdicts on those roll calls are backwards AND the explainer is lying about it.`);
  }

  // And an entry that deliberately does NOT claim inversion must not silently gain one.
  eq(inverts("On ordering the previous question"), false,
    "GLOSSARY.previousquestion describes a party-discipline vote, not an inverted one — if the\n" +
    "    code now inverts it, that entry needs rewriting");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contracts 3 & 4 — thin-data thresholds and the two-scope boundary
//   Code:  consistency.js  saydoScore() / isSaydoReceipt()
//   Claim: "Below two directional items… With two or three… flagged as thin"
//          "🧾 Say-vs-Do … never from votes"
// ═════════════════════════════════════════════════════════════════════════════
{
  const noopEl = () => ({
    style: {}, textContent: "", innerHTML: "", setAttribute() {}, appendChild() {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  });
  const ctx = {
    console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN, encodeURIComponent,
    requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
    document: {
      readyState: "complete", head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, createTextNode: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  vm.runInContext(read("consistency.js"), vm.createContext(ctx), { filename: "consistency.js" });

  const C = ctx.window.PDXConsistency;
  must(C && typeof C.saydoScore === "function",
    "consistency.js no longer exposes PDXConsistency.saydoScore — the thin-data thresholds\n" +
    "  described in GLOSSARY.norecord are unprobeable");
  must(typeof C.isSaydoReceipt === "function",
    "consistency.js no longer exposes PDXConsistency.isSaydoReceipt — the Official-Record ÷\n" +
    "  Say-vs-Do boundary described in GLOSSARY.saydo is unprobeable");

  // ── Contract 3: derive both thresholds by sweeping the real function ────────
  // min  = the smallest evidence count that yields a number at all
  // thin = the largest evidence count still flagged thin
  let min = null, thinMax = null;
  for (let n = 0; n <= 24; n++) {
    const r = C.saydoScore(n, 0);
    if (r.pct !== null && min === null) min = n;
    if (r.pct !== null && r.thin) thinMax = n;
  }
  must(min !== null,
    "saydoScore() never returns a percentage for any evidence count — the thin-data rule\n" +
    "  described in GLOSSARY.norecord cannot be characterised");
  must(thinMax !== null,
    "saydoScore() never flags any evidence count as thin — GLOSSARY.norecord describes a\n" +
    "  thin-data band that no longer exists");

  eq(C.saydoScore(min - 1, 0).pct, null, `thin-data: ${min - 1} item(s) must still show no number`);
  ok(C.saydoScore(thinMax + 1, 0).thin === false,
    `thin-data: ${thinMax + 1} items should be past the thin band`);
  ok(min >= 2,
    `HONESTY REGRESSION: saydoScore() now shows a percentage from ${min} directional item(s).\n` +
    "    With one item the only possible readings are 0% and 100%, which looks like a finding\n" +
    "    and carries none. GLOSSARY.norecord promises we do not do this.");

  // The glossary states both thresholds as words, so they are checked as words.
  const NUM_WORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six" };
  must(NUM_WORDS[min] && NUM_WORDS[thinMax],
    `thin-data thresholds are now min=${min}, thinMax=${thinMax} and this harness has no word\n` +
    "  for one of them. Extend NUM_WORDS, then update GLOSSARY.norecord to match.");
  const nr = copyOf("norecord");
  ok(has(nr, "below " + NUM_WORDS[min]),
    `DRIFT: saydoScore() withholds a number below ${min} item(s), but GLOSSARY.norecord does not\n` +
    `    say "below ${NUM_WORDS[min]}". The explainer is describing a threshold the code left behind.`);
  ok(has(nr, NUM_WORDS[min] + " or " + NUM_WORDS[thinMax]),
    `DRIFT: the thin band is ${min}–${thinMax} items, but GLOSSARY.norecord does not say\n` +
    `    "${NUM_WORDS[min]} or ${NUM_WORDS[thinMax]}".`);

  // ── Contract 4: the two-scope boundary ─────────────────────────────────────
  // The glossary's central structural promise is that the two numbers are never
  // blended. Concretely: formal votes must stay out of the Say-vs-Do pool.
  eq(C.isSaydoReceipt({ category: "voting" }), false,
    "BOUNDARY BREACH: a 'voting' receipt now counts toward Say-vs-Do. GLOSSARY.saydo and\n" +
    "    GLOSSARY.officialrecord both promise the Say-vs-Do read is built from public-record\n" +
    "    evidence and NEVER from votes — and the methodology sheet says the same. Either the\n" +
    "    exclusion was dropped by accident, or every one of those explainers needs rewriting.");
  eq(C.isSaydoReceipt({ category: "promise" }), false,
    "BOUNDARY BREACH: a 'promise' receipt now counts toward Say-vs-Do; promises are a separate\n" +
    "    tracked system, and counting them here double-counts them");
  eq(C.isSaydoReceipt({ category: "statement" }), true,
    "a plain statement must still count as Say-vs-Do evidence, or the scope is empty");
  eq(C.isSaydoReceipt({ category: "VOTING" }), false,
    "the voting exclusion must be case-insensitive — a differently-cased category would leak\n" +
    "    formal votes into Say-vs-Do while the glossary says that never happens");

  // Every category the code excludes must be one the copy accounts for, so a newly
  // excluded category can't quietly narrow the scope the glossary describes.
  const csrc = read("consistency.js");
  const em = csrc.match(/SAYDO_EXCLUDE\s*=\s*\{([^}]*)\}/);
  must(em, "cannot locate the SAYDO_EXCLUDE set in consistency.js — re-derive it here and confirm\n" +
    "  GLOSSARY.saydo still describes what the Say-vs-Do scope leaves out");
  const excluded = [...em[1].matchAll(/['"]?([a-z_]+)['"]?\s*:/g)].map((m) => m[1]);
  ok(excluded.length > 0, "SAYDO_EXCLUDE parsed to an empty set");
  const scopeCopy = copyOf("saydo") + " " + copyOf("officialrecord") + " " + copyOf("contradiction");
  const ACCOUNTED = { voting: ["vote"], promise: ["promise"] };
  for (const cat of excluded) {
    const words = ACCOUNTED[cat];
    ok(words,
      `UNDOCUMENTED EXCLUSION: consistency.js now keeps '${cat}' receipts out of the Say-vs-Do\n` +
      `    scope, but the glossary never mentions it. GLOSSARY.saydo tells the reader exactly what\n` +
      `    each of the two numbers is built from; a silent exclusion makes that description wrong.`);
    if (words) {
      ok(words.some((w) => has(scopeCopy, w)),
        `DRIFT: '${cat}' is excluded from Say-vs-Do but the glossary's scope copy never says so`);
    }
  }
}

if (failures.length) {
  console.error(
    `✗ glossary honesty: ${failures.length} contract(s) broken — the education layer is\n` +
    "  describing rules the code no longer follows.\n\n  " + failures.join("\n\n  ") + "\n"
  );
  process.exit(1);
}
console.log(`✓ glossary honesty: all ${passed} assertions passed (4 code↔copy contracts verified)`);
