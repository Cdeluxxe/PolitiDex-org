#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS VOTE COUNTS ON THIS ISSUE — the roll-call mechanism line
// ─────────────────────────────────────────────────────────────────────────────
// A member issue dossier can be completely correct and still read as an assertion.
// The reader is told the member SAID they support election security, that the
// formal record is "0 aligned · 5 against", and then the five votes underneath are
// listed by bill title with a "Multi-issue bill — 7 issues" chip. Nothing on the
// face says what part of the measure is about THIS issue, so the verdict arrives
// without its argument. It is worst exactly where it matters most: an appropriations
// or omnibus vehicle whose short title names an account family, scored off one
// amendment, one division or one section buried inside it.
//
//   H.Amdt. 235  ·  119th Congress  ·  Voted Nay
//     What it did:        Voted Nay on the question “On Agreeing to the Amendment”.
//     How it was linked:  Counted on 🕊️ Israel Support because that is the primary
//                         subject of this measure.
//     Multi-issue bill — 3 issues
//
// Both lines are true. Neither tells the reader that the amendment zeroes out the
// Foreign Military Financing account, which is where U.S. security assistance to
// Israel is actually paid from. The executive lane has solved this for years with a
// curated "what it did" and "why it counts here"; this file holds the member
// roll-call lane to the same standard, and holds it at 100% rather than at a
// coverage percentage, because a reader arriving at a Contradicted verdict is
// arriving to argue with it.
//
// WHAT THIS FILE PINS
//
//   1 · EVERY JUDGED ROLL-CALL ACT IS EXPLAINED. On a Contradicted or Mixed row,
//       every act carries a written mechanism line in the curated voice. No empty
//       slot, no derived restatement, no "counted on X because that is X".
//   2 · THE LINE IS ABOUT THE ISSUE, NOT THE BILL. Not the measure title, not the
//       ballot and the question, and a different sentence for every chip the same
//       measure sits on. One vote on seven issues owes seven explanations.
//   3 · IT READS LIKE A SENTENCE. Two sentences, 340 characters, no section
//       symbols and no code citations — the statute wall belongs behind the fold.
//   4 · THE DIRECTION BEAT SURVIVES. Yea/Nay is still readable against the stance
//       chip, and the row claims no outcome the record cannot show.
//   5 · MULTI-ISSUE DISCLOSURE COMES AFTER THE LINK, NEVER INSTEAD OF IT. On the
//       rendered row: local mechanism, then which way it cut, then the caveat that
//       enumerates the other issues.
//   6 · A NARROW LINK SAYS IT IS NARROW. Every curated narrow (measure, issue) pair
//       discloses its reach in the sentence a reader actually reads.
//   7 · THE HONESTY PATTERN HOLDS. Derived rows still render in the derived voice
//       under their own label, and a framing-only rationale — "supporters say…" —
//       never counts as an explanation.
//   8 · NOTHING MOVED. Verdicts, Direction Match and per-issue percentages are
//       computed three ways — with the prose, with the prose table emptied, and
//       with the mapping rationales emptied — and must be identical. This whole
//       pass is presentation and mapping-rationale copy; if a number moves, prose
//       has reached the scoring path.
//
//   node scripts/test-rollcall-mechanism.mjs
//
// The member roll-call lane is an API in a live browser. vr-record-corpus.mjs
// rebuilds it offline from the shipped seeds so this harness sees the rows a reader
// sees, deterministically, from the same fixed seed files every run.
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
];

function boot(src) {
  const win = makeSandbox();
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(src ? src(f) : R(f), sb, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const section = (t) => console.log(`\n${t}`);

const win = boot();
const CS = win.PDXConsistency;
const { byMember, stats } = buildCorpus(ROOT);
for (const [pid, items] of byMember) if (win.CMP_DATA[pid]) win.PDXVotingRecord.noteMember(pid, items);
console.log(`corpus: ${stats.rolls} roll calls · ${stats.cells} member cells · ${stats.members} members`);

// ── The population ───────────────────────────────────────────────────────────
// Judged roll-call acts on Contradicted and Mixed rows. Held items are out: a held
// row answers "why is this NOT being counted", and keeps its hold reason in the
// slot this file is about. Aligned rows are out too, and deliberately — the brief
// this pass was written to says an aligned row may keep the derived voice as long
// as it is marked, and blocking the pass on perfecting every consistent row is how
// the contradicted ones stay unexplained.
const GATED = new Set(["contradicts", "mixed"]);
const acts = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let issueRows = [];
  try { issueRows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of issueRows) {
    const token = r.verdict && r.verdict.token;
    if (!GATED.has(token)) continue;
    let items = [];
    try { items = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    items.forEach((d, i) => {
      if (d.held || d.lane !== "record") return;
      acts.push({ pid, key: r.key, label: r.label, token, i, d, m: CS.dossierMechanism(d, r.key) });
    });
  }
}
console.log(`subjects: ${acts.length} judged roll-call acts on Contradicted / Mixed rows`);
ok(acts.length > 400,
  `only ${acts.length} judged roll-call acts reached — the offline corpus stopped feeding this file,\n` +
  "    and every assertion below is passing on a thin set");

// One entry per (measure, issue): the unit a curator actually writes, and the unit
// the copy standards below are about. A bad sentence on a bill 40 members voted on
// is one mistake, not forty.
const pairs = new Map();
for (const a of acts) {
  const it = a.d.item || {};
  const k = `${it.number}|${it.congress}|${a.key}`;
  if (!pairs.has(k)) pairs.set(k, { k, key: a.key, a, n: 0 });
  pairs.get(k).n++;
}
console.log(`           ${pairs.size} distinct (measure, issue) pairs behind them`);
ok(pairs.size > 100, `only ${pairs.size} distinct judged pairs — the copy standards are running on a thin set`);

const DERIVED = /^Counted on .+ because that is /;

/* ═══ 1 · every judged roll-call act is explained ═════════════════════════ */
section("1 · a written mechanism line on every judged act — no title-only face");
{
  let derivedActs = 0;
  const owed = new Map();
  for (const a of acts) {
    const at = `${a.pid}/${a.key} [${a.d.ident}]`;
    ok((a.m.did || "").trim().length > 0, `${at}: the "what it did" slot is empty`);
    ok((a.m.counts || "").trim().length > 0, `${at}: the "why it counts here" slot is empty`);
    // The two shapes of a title-only face: the ballot with the roll-call question
    // after it, and the measure's own title with a verb bolted on the front. Both
    // are what the renderer produces when nobody has read the document.
    ok(a.m.did !== `Voted Yea on the question “${a.d.question}”.` &&
       a.m.did !== `Voted Nay on the question “${a.d.question}”.` &&
       a.m.did !== `Did not vote on the question “${a.d.question}”.`,
      `${at}: "what it did" is the ballot and the roll-call question — the face teaches nothing`);
    ok(String(a.m.did).trim() !== String(a.d.title || "").trim() &&
       String(a.m.did).trim() !== String(a.d.ident || "").trim(),
      `${at}: "what it did" is the measure's own title`);
    if (a.m.countsBy !== "curated") {
      derivedActs++;
      const it = a.d.item || {};
      const k = `${it.number}|${it.congress}|${a.key}`;
      owed.set(k, (owed.get(k) || 0) + 1);
    } else {
      ok(!DERIVED.test(a.m.counts),
        `${at}: rendered in the curated voice but the sentence is the derived restatement`);
    }
  }
  // Not a ratchet. A judged act with no written line is the failure this pass
  // exists to end, and the message names the pairs so the fix is a work list.
  ok(derivedActs === 0,
    `${derivedActs} judged roll-call act(s) across ${owed.size} (measure, issue) pair(s) still fall back to the ` +
    `derived line: ${[...owed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} (${n})`).join(", ")}`);
  console.log(`   ${acts.length} acts · ${acts.length - derivedActs} written · ${derivedActs} derived`);
}

/* ═══ 2 · the line is about the issue, not about the bill ═════════════════ */
section("2 · one vote on N issues owes N explanations");
{
  const byMeasure = new Map();
  for (const { k, a } of pairs.values()) {
    if (a.m.countsBy !== "curated") continue;
    const at = k;
    const did = String(a.m.did), why = String(a.m.counts);
    ok(did.trim() !== why.trim(), `${at}: "why it counts here" repeats "what it did" verbatim`);
    ok(did.slice(0, 40).toLowerCase() !== why.slice(0, 40).toLowerCase(),
      `${at}: both mechanism lines open with the same clause`);
    // The mechanism line has to say something the row head does not. A "why" that
    // is the bill's own short title back at the reader is the derived failure in a
    // curated coat.
    const ident = String(a.d.ident || "").trim();
    ok(!(ident && why.trim() === ident), `${at}: the mechanism line is the measure label`);
    const mk = k.split("|").slice(0, 2).join("|");
    if (!byMeasure.has(mk)) byMeasure.set(mk, new Map());
    byMeasure.get(mk).set(a.key, why.trim());
  }
  // A measure on three judged chips needs three different sentences, or two of the
  // chips are being told the third one's story — which is precisely the "multi-issue
  // bill, one explanation" failure, restated.
  let multiChip = 0;
  for (const [mk, chips] of byMeasure) {
    if (chips.size < 2) continue;
    multiChip++;
    const whys = [...chips.values()];
    ok(new Set(whys).size === whys.length,
      `${mk}: two of its ${chips.size} judged chips carry the same mechanism line — one of them is wrong`);
  }
  ok(multiChip >= 10, `only ${multiChip} multi-chip measures reached the per-issue uniqueness check`);
  console.log(`   ${multiChip} measures judged on more than one chip, each with its own sentence`);
}

/* ═══ 3 · it reads like a sentence ════════════════════════════════════════ */
section("3 · two sentences, 340 characters, no statute wall on the face");
{
  // Sentence counting has to survive the abbreviations this corpus is made of:
  // "H.R. 884", "U.S. Central Command" and "Sec. 4" are not sentence ends.
  const ABBR = /(?:\b[A-Z]|H\.R|H\.J|H\.Con|H\.Amdt|S\.J|S\.Con|S\.Amdt|U\.S|U\.S\.C|Sec|Secs|No|Nos|Pub|Art|Mr|Ms|Mrs|Dr|St|vs|etc|Inc|Co)\.$/;
  const sentences = (txt) => {
    const parts = String(txt).split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/);
    const out = [];
    for (const part of parts) {
      if (out.length && ABBR.test(out[out.length - 1])) out[out.length - 1] += " " + part;
      else out.push(part);
    }
    return out;
  };
  // The framing vocabulary share-card guard 16 already refuses to publish on. A
  // sentence about who argued what is not a statement of what the measure does, so
  // it cannot be what makes a row count as explained.
  const FRAMING = /^\s*(?:framed by\s+)?(?:supporters?|opponents?|critics?|detractors?|proponents?)\b/i;
  let longest = 0;
  for (const { k, a } of pairs.values()) {
    if (a.m.countsBy !== "curated") continue;
    const why = String(a.m.counts), did = String(a.m.did);
    longest = Math.max(longest, why.length);
    ok(sentences(why).length <= 2,
      `${k}: the mechanism line runs to ${sentences(why).length} sentences — the row face is not the fold`);
    ok(why.length <= 340, `${k}: the mechanism line is ${why.length} characters`);
    ok(sentences(did).length <= 2, `${k}: "what it did" runs to ${sentences(did).length} sentences`);
    ok(!/§/.test(did + why), `${k}: a section symbol is on the face`);
    ok(!/\bU\.S\.C\.\s*\d/.test(did + why), `${k}: a code citation is on the face`);
    ok(!FRAMING.test(why), `${k}: the mechanism line reports a framing rather than an effect`);
    ok(!FRAMING.test(did), `${k}: "what it did" reports a framing rather than an effect`);
  }
  console.log(`   longest mechanism line on a judged act: ${longest} characters`);
}

/* ═══ 4 · the direction beat survives ═════════════════════════════════════ */
section("4 · Yea/Nay still readable against the stance, with no invented outcome");
{
  const OUTCOME = /\b(which lowered|which raised|which cut|this lowered|this raised|resulting in a drop|led to a fall|failed in committee|died in committee)\b/i;
  let dir = 0, ballot = 0;
  for (const a of acts) {
    const at = `${a.pid}/${a.key} [${a.d.ident}]`;
    const cut = String(a.m.dir || "");
    if (cut) {
      dir++;
      // The beat is "on this issue a Yea counts as support, and they voted Nay" —
      // the mapping's direction and the ballot, in one sentence a reader can check
      // against the stance chip without knowing what supportMeaning is.
      ok(/a Yea counts as (support for|opposition to) the issue’s direction/.test(cut),
        `${at}: the direction line does not say what a Yea counts as on this issue —\n    "${cut}"`);
      if (String(a.d.act || "").trim()) {
        ballot++;
        ok(/, and they (voted (Yea|Nay|Present)|did not vote)\b/i.test(cut),
          `${at}: the ballot is on file but the direction line does not say how they voted —\n    "${cut}"`);
      }
      // The verdict the row reads is named in the same breath, so the reader can see
      // the step from this one vote to the chip above it.
      ok(/this row reads “/.test(cut) || /—/.test(cut),
        `${at}: the direction line does not connect the ballot to the row's verdict`);
    }
    ok(!OUTCOME.test(String(a.m.did) + " " + String(a.m.counts) + " " + cut),
      `${at}: the row claims an outcome the record does not show`);
  }
  ok(dir > 400, `only ${dir} rows carried a direction line — the beat is being dropped`);
  ok(ballot > 400, `only ${ballot} rows named the ballot in the direction line`);
  console.log(`   ${dir} rows carry the direction sentence · ${ballot} name the ballot in it`);
}

/* ═══ 5 · disclosure after the link, never instead of it ══════════════════ */
section("5 · multi-issue caveat still enumerates, and still comes second");
{
  const faceRows = new Map();
  const rowsOfFace = (pid, key) => {
    const k = pid + "|" + key;
    if (faceRows.has(k)) return faceRows.get(k);
    const html = CS.dossierRecordsHtml ? CS.dossierRecordsHtml(pid, key) : "";
    const parts = html ? html.split('<details class="pdxdos-rec"').slice(1) : [];
    faceRows.set(k, parts);
    return parts;
  };
  const multi = acts.filter((a) => a.d.multi);
  ok(multi.length > 0, "no multi-issue roll-call act reached — the ordering check has no subject");
  let checked = 0, enumerated = 0;
  for (const a of multi) {
    const at = `${a.pid}/${a.key} [${a.d.ident}]`;
    const part = rowsOfFace(a.pid, a.key)[a.i];
    if (!part) continue;
    checked++;
    const did = part.indexOf("What it did:");
    const why = part.indexOf("Why it counts here:");
    const cut = part.indexOf("Which way it cut:");
    const cav = part.indexOf("Multi-issue ");
    ok(did !== -1, `${at}: the rendered row has no "What it did" label`);
    ok(why !== -1, `${at}: a judged multi-issue row is rendering in the derived voice`);
    ok(cut !== -1, `${at}: the rendered row has no direction line`);
    if (did === -1 || why === -1 || cut === -1) continue;
    ok(did < why && why < cut && (cav === -1 || cut < cav),
      `${at}: the multi-issue caveat is printed before the row explains the local link\n` +
      `    (did=${did} why=${why} cut=${cut} caveat=${cav})`);
    // And the caveat is still a caveat: it names the other issues rather than
    // standing in for the one the reader is on.
    if (cav !== -1) {
      enumerated++;
      const tail = part.slice(cav, cav + 400);
      ok(/\d+\s+issues?/.test(tail),
        `${at}: the multi-issue block no longer says how many issues the vote touched`);
    }
  }
  ok(checked > 100, `only ${checked} multi-issue rows were ordering-checked — the row split stopped matching the markup`);
  ok(enumerated > 100, `only ${enumerated} multi-issue rows still printed the enumeration block`);
  console.log(`   ${checked} multi-issue rows checked · ${enumerated} still enumerate the other issues`);
}

/* ═══ 6 · a narrow link says it is narrow ═════════════════════════════════ */
section("6 · every curated narrow pair discloses its reach");
{
  // The phrase "narrow link" is the house form, and test-record-face-teaching holds
  // the floor on it. Several lines disclose in the sentence's own words instead —
  // "one section of", "weighted 45", "it reaches military installations only" — and
  // that is better copy, not a miss. The gate here is on the disclosure, at 100%.
  const DISCLOSES = /narrow link|supporting link|narrow(ly)? |weighted (low|below|down|at \d|\d)|weight(ed)? \d|one section|one division|one subtitle|one account|one appropriation|one provision|one title|a small share|share of the bill|reaches only|it reaches |only that |alone\b|not a referendum|a few |handful of/i;
  const narrow = [...pairs.values()].filter((p) => p.a.d.narrow && p.a.m.countsBy === "curated");
  ok(narrow.length > 0, "no curated narrow judged pair reached — weight is filtering the ledger again");
  for (const p of narrow) {
    ok(DISCLOSES.test(String(p.a.m.counts)),
      `${p.k}: a narrow-weight link with nothing on the face to say it is narrow —\n    "${p.a.m.counts}"`);
  }
  const said = narrow.filter((p) => /narrow link/i.test(p.a.m.counts)).length;
  console.log(`   ${narrow.length} curated narrow judged pairs · ${said} use the phrase "narrow link"`);
}

/* ═══ 7 · the honesty pattern holds ═══════════════════════════════════════ */
section("7 · derived still looks derived, and a framing is never an explanation");
{
  const src = R("consistency.js");
  // The two voices are still two voices. If these labels collapse into one, a
  // reader loses the only signal that separates "a curator explained this" from
  // "the renderer restated the mapping".
  ok(/DOS_WHY_CURATED = 'Why it counts here:'/.test(src), "the curated mechanism label is gone");
  ok(/DOS_WHY_DERIVED = 'How it was linked:'/.test(src), "the derived mechanism label is gone");
  ok(/Not yet explained by a curator/.test(src), "the unexplained marker is gone");
  // And the derived rendering is still exercised by real data somewhere on the
  // lane — aligned rows keep it, by design. A record lane with no derived row left
  // means the honesty pattern is untested rather than unnecessary.
  let derivedSomewhere = 0, curatedSomewhere = 0;
  for (const pid of byMember.keys()) {
    if (!win.CMP_DATA[pid]) continue;
    let issueRows = [];
    try { issueRows = CS.issueRows(pid) || []; } catch (e) { continue; }
    for (const r of issueRows) {
      let items = [];
      try { items = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
      for (const d of items) {
        if (d.lane !== "record") continue;
        const m = CS.dossierMechanism(d, r.key) || {};
        if (m.countsBy === "curated") curatedSomewhere++; else derivedSomewhere++;
      }
    }
  }
  ok(derivedSomewhere > 0,
    "no record row renders derived any more — point the derived assertions at a fixture before deleting them");
  ok(curatedSomewhere > derivedSomewhere,
    `the record lane is ${curatedSomewhere} curated to ${derivedSomewhere} derived — coverage went backwards`);
  console.log(`   whole record lane: ${curatedSomewhere} curated · ${derivedSomewhere} derived, both voices live`);

  // A framing-only mapping rationale must not be sitting under a judged act
  // pretending to be the explanation. The L4 fold prints the rationale verbatim
  // under its own label, so a "supporters say" sentence there is a framing on the
  // page whichever slot it lands in.
  const FRAMING = /^\s*(?:framed by\s+)?(?:supporters?|opponents?|critics?|detractors?|proponents?|some\s+[a-z-]+(?:\s+[a-z-]+)?\s+(?:groups?|advocates?|universities|organizations?))\b/i;
  const rationale = new Map();
  for (const m of JSON.parse(R("db/vr-issue-seed.json")).measures || []) {
    for (const i of m.issues || []) {
      rationale.set(`${m.number}|${m.congress}|${i.issueKey}`, String(i.rationale || "").trim());
    }
  }
  let thin = 0;
  for (const p of pairs.values()) {
    const r = rationale.get(p.k);
    if (r === undefined) continue;
    ok(!FRAMING.test(r), `${p.k}: the mapping rationale under a judged act reports a framing, not an effect`);
    // And the audit trail says more than the row face does, or the fold is a
    // second copy of the line above it. 120 characters is roughly the length of
    // the shortest curated mechanism line on the lane.
    if (r.length < 120) thin++;
  }
  ok(thin === 0,
    `${thin} judged (measure, issue) pair(s) still have a mapping rationale shorter than the line on the face — ` +
    "the fold has nothing to add");
  console.log(`   ${pairs.size} judged pairs · 0 framing rationales · ${thin} rationales thinner than the face`);
}

/* ═══ 8 · nothing moved ═══════════════════════════════════════════════════ */
section("8 · verdicts, Direction Match and issue percentages are identical three ways");
{
  // Control run A: the curated prose table emptied. Control run B: the mapping
  // rationale routed to the L4 fold emptied. Neither may move a number. Between
  // them they cover everything this pass wrote.
  const blankProse = boot((f) => {
    const s = R(f);
    if (f !== "consistency.js") return s;
    const out = s.replace(/var _DOS_MECH = \{[\s\S]*?\n  \};/, "var _DOS_MECH = {};");
    if (out === s) throw new Error("could not blank _DOS_MECH for the control run");
    return out;
  });
  const blankRationale = boot((f) => {
    const s = R(f);
    if (f !== "consistency.js") return s;
    const out = s.replace(
      /function _dosMechRationale\(item, issueKey\) \{[\s\S]*?\n  \}/,
      "function _dosMechRationale(item, issueKey) { return ''; }");
    if (out === s) throw new Error("could not blank _dosMechRationale for the control run");
    return out;
  });
  const controls = [["prose table emptied", blankProse], ["mapping rationales emptied", blankRationale]];
  for (const [name, w] of controls) {
    for (const [pid, items] of byMember) if (w.CMP_DATA[pid]) w.PDXVotingRecord.noteMember(pid, items);
  }
  // A control that changes nothing proves nothing. Before comparing numbers, check
  // that each control run really did remove the prose it was built to remove — the
  // first should send the judged acts back to the derived voice, the second should
  // empty the L4 fold. Otherwise the regex silently stopped matching and this whole
  // section is asserting that a thing equals itself.
  {
    const probe = acts[0];
    const A = blankProse.PDXConsistency;
    const bare = (A.dossierItems(probe.pid, probe.key) || []).filter((d) => d.lane === "record" && !d.held);
    ok(bare.length > 0, "the control run rendered no record acts — the corpus did not reach it");
    const derivedNow = bare.filter((d) => (A.dossierMechanism(d, probe.key) || {}).countsBy !== "curated").length;
    ok(derivedNow === bare.length,
      `blanking the prose table left ${bare.length - derivedNow} of ${bare.length} acts curated — the control is not a control`);
    const B = blankRationale.PDXConsistency;
    const bItems = (B.dossierItems(probe.pid, probe.key) || []).filter((d) => d.lane === "record" && !d.held);
    ok(bItems.length === bare.length, "the two control runs disagree on how many acts are on the row");
  }

  let compared = 0, dm = 0;
  for (const pid of Object.keys(win.CMP_DATA)) {
    let a = [];
    try { a = CS.issueRows(pid) || []; } catch (e) { continue; }
    for (const [name, w] of controls) {
      const C = w.PDXConsistency;
      let b = [];
      try { b = C.issueRows(pid) || []; } catch (e) { continue; }
      ok(a.length === b.length, `${pid}: the issue-row count changed with the ${name}`);
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        compared++;
        ok(a[i].key === b[i].key, `${pid}: issue-row order changed with the ${name}`);
        ok((a[i].verdict && a[i].verdict.token) === (b[i].verdict && b[i].verdict.token),
          `${pid}/${a[i].key}: the verdict moved with the ${name}`);
        ok((a[i].pct == null ? null : a[i].pct) === (b[i].pct == null ? null : b[i].pct),
          `${pid}/${a[i].key}: the issue percentage moved with the ${name}`);
      }
      const s1 = CS.scopedOverall ? CS.scopedOverall(pid, "official") : null;
      const s2 = C.scopedOverall ? C.scopedOverall(pid, "official") : null;
      if (s1 && s2) {
        dm++;
        ok(s1.pct === s2.pct, `${pid}: Direction Match reads ${s1.pct} with the prose and ${s2.pct} with the ${name}`);
        ok(s1.n === s2.n, `${pid}: the Direction Match denominator moved with the ${name}`);
      }
    }
  }
  ok(compared > 4000, `only ${compared} issue rows were compared across the control runs`);
  ok(dm > 200, `only ${dm} Direction Match readings were compared across the control runs`);
  console.log(`   ${compared} issue rows and ${dm} Direction Match readings, unmoved by either control`);
}

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ roll-call mechanism: ${fails.length} failed, ${pass} passed\n`);
  fails.slice(0, 40).forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  if (fails.length > 40) console.error(`  … and ${fails.length - 40} more\n`);
  process.exit(1);
}
console.log(`\n✓ roll-call mechanism: all ${pass} assertions passed — ${acts.length} judged roll-call acts across ` +
  `${pairs.size} (measure, issue) pairs, every one saying what the measure did on THIS issue and which way the ballot cut`);
