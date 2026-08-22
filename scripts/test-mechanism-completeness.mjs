#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// EVERY JUDGED INSTRUMENT TEACHES WHY IT COUNTS ON THIS ISSUE
// ─────────────────────────────────────────────────────────────────────────────
// A contradicted row is the row a reader is most likely to dispute and least
// likely to already understand. Before this pass, the worst of them showed a
// citation, a chip, and a sentence that restated the mapping back at the reader:
//
//   Public Law 119-21  ·  Signed into law  ·  Says one thing, does another
//     What it did:        Restricts graduate and parent student-loan borrowing…
//     Why it counts here: Counted on 🎓 Lower College & Trade Costs because that
//                         is one of the subjects this law was mapped to, on a
//                         link the curation records as a narrow one.
//
// The second line is true and teaches nothing. It says the mapping exists; it
// never says what the law did on THIS issue or why that cuts against what was
// promised. A verdict without a mechanism sentence asks the reader to already
// know the bill — and on a fourteen-issue reconciliation vehicle, nobody does.
//
// The dossier already had the right slot for it: `counts`, an optional curated
// per-issue sentence that wins the "Why it counts here" line outright when the
// seed carries one, and falls back to that restatement when it does not. So the
// repair was curation, not rendering — and this harness is what keeps it:
//
//   1. NO JUDGED ROW FALLS BACK. For every profile, every issue row whose verdict
//      is Contradicted or Mixed, every instrument on it that is actually being
//      counted must carry a curated "why it counts here" — not the derived
//      restatement. Scoped to the two verdicts where the reader needs it most;
//      "Backed it up" rows are welcome to it but not gated here.
//   2. AND NO JUDGED ROW IS TITLE-ONLY. `plain` — "what it did" — must be there
//      too, on the same rows, for the same reason.
//   3. THE ORDER IS THE ARGUMENT. What it did, then why it counts here, then
//      which way it cut, and only then the multi-issue caveat. A reader who meets
//      "this document was mapped to 14 issues" before learning what it did on
//      this one has been told the row is unreliable before it says anything.
//   4. THE MECHANISM SENTENCE IS NOT A RESTATEMENT. A curated line that merely
//      repeats the plain line, or the derived fallback's own words, fails.
//   5. A LAW IS CALLED BY BOTH ITS NAMES. "Public Law 119-21" is the citation and
//      "H.R. 1" is the name anyone would recognise or search for; the row head
//      prints both when the file carries both.
//   6. THE SCORE PATH IS UNTOUCHED. Curated prose reaches the row face and
//      nothing else — the verdict on every gated row is re-derived here and must
//      match what the shared row model already said.
//
//   7 · AND THE ROLL-CALL LANE IS IN THE POPULATION NOW. It used to be out of it
//      for a mechanical reason — the lane is an API in a live browser and there
//      was no way to reach it from node — not because a judged roll call needs
//      less explaining than a judged executive order. vr-record-corpus.mjs
//      rebuilds the lane offline from the shipped seeds, so this file now holds
//      the same gate over it, at the coverage the existing-inventory pass reached
//      rather than at 100%: the measures with no text on file stay derived on
//      purpose and are counted, not waived.
//
//   node scripts/test-mechanism-completeness.mjs
//
// Runs the shipped renderer over the shipped data in one node:vm sandbox. No
// database, no network, no DOM beyond gen-hero-showcase.mjs's stub.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

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
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;

// The roll-call lane, rebuilt offline. Seeding it here is what puts record rows
// into the gated population below; without it every record-lane assertion in this
// file is vacuously true and says so in its own count.
const { byMember } = buildCorpus(ROOT);
for (const [pid, items] of byMember) if (win.CMP_DATA[pid]) win.PDXVotingRecord.noteMember(pid, items);

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const section = (t) => console.log(`\n${t}`);

// ── The population: every judged instrument on a Contradicted or Mixed row ───
// Held items are excluded on purpose. A held row answers a different question —
// not "why does this count" but "why is this NOT being counted" — and it keeps its
// hold reason in that slot by design.
const GATED = new Set(["contradicts", "mixed"]);
const rows = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let issueRows = [];
  try { issueRows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of issueRows) {
    const token = r.verdict && r.verdict.token;
    if (!GATED.has(token)) continue;
    let items = [];
    try { items = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    items.forEach((d, i) => {
      if (d.held) return;
      rows.push({ pid, key: r.key, label: r.label, token, i, d, m: CS.dossierMechanism(d, r.key) });
    });
  }
}

console.log(`subjects: ${rows.length} judged instruments on Contradicted / Mixed issue rows`);
ok(rows.length > 40,
  `only ${rows.length} judged instruments found — the fixture stopped reaching the real data,\n` +
  `    so every assertion below is passing on an empty set`);

/* ═══════════════════════════════════════════════════════════════════════════
   1 · every judged row carries a curated "why it counts here"
   ═══════════════════════════════════════════════════════════════════════════ */
section("1 · no judged row falls back to a restatement of its own mapping");
// The derived fallback's signature. It is a fine default on a row nobody disputes;
// it is not acceptable on the two verdicts a reader comes to argue with.
const DERIVED = /^Counted on .+ because that is /;
for (const r of rows) {
  const at = `${r.pid}/${r.key} [${r.d.ident}]`;
  // The roll-call lane derives its mechanism from the question and the ballot,
  // which the record does carry — see _dosItems. It has no curated slot to fill.
  if (r.d.lane === "record") continue;
  ok(typeof r.d.counts === "string" && r.d.counts.trim().length > 0,
    `${at}: no curated "why it counts here" — the row falls back to restating the mapping`);
  ok(!DERIVED.test(r.m.counts || ""),
    `${at}: the rendered mechanism line is the derived restatement, not a curated sentence`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2 · and no judged row is title-only
   ═══════════════════════════════════════════════════════════════════════════ */
section("2 · every judged row says what the instrument did");
for (const r of rows) {
  const at = `${r.pid}/${r.key} [${r.d.ident}]`;
  ok((r.m.did || "").trim().length > 0, `${at}: no "what it did" line at all`);
  if (r.d.lane === "record") continue;
  ok(typeof r.d.plain === "string" && r.d.plain.trim().length > 0,
    `${at}: no plain-language sentence — the row shows a citation and a verdict, nothing between`);
  // A title recycled as a mechanism sentence is the failure this slot exists to
  // end: "Signed into law — To provide for reconciliation pursuant to title II of
  // H. Con. Res. 14." tells a reader nothing anyone read the document.
  ok(r.m.did !== `${r.d.act} — ${r.d.title}.`,
    `${at}: the "what it did" line is the document's own title with the verb in front of it`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3 · the order is the argument
   ═══════════════════════════════════════════════════════════════════════════ */
section("3 · local link before the multi-issue caveat, on the rendered row");
const multi = rows.filter((r) => r.d.multi);
ok(multi.length > 0, "no multi-issue instrument reached — the ordering check has no subject");
// PER ROW, NOT PER FACE. Reading the four offsets off the whole face takes the
// first occurrence of each label anywhere on it, so on a face whose first row is
// derived and whose third is curated the check compares row 1's "What it did"
// against row 3's "Why it counts here" and reports an ordering bug that is really
// two different rows. Split on the row container first — the same <details> the
// reader opens — and the check means what it says.
const faceRows = new Map();
const rowsOfFace = (pid, key) => {
  const k = pid + "|" + key;
  if (faceRows.has(k)) return faceRows.get(k);
  const html = CS.dossierRecordsHtml ? CS.dossierRecordsHtml(pid, key) : "";
  const parts = html ? html.split('<details class="pdxdos-rec"').slice(1) : [];
  faceRows.set(k, parts);
  return parts;
};
let ordered = 0;
for (const r of multi) {
  const at = `${r.pid}/${r.key} [${r.d.ident}]`;
  const part = rowsOfFace(r.pid, r.key)[r.i];
  if (!part) continue;
  const did = part.indexOf("What it did:");
  const why = part.indexOf("Why it counts here:");
  const derivedWhy = part.indexOf("How it was linked:");
  const cut = part.indexOf("Which way it cut:");
  const cav = part.indexOf("Multi-issue ");
  // Either voice fills the second slot; the ordering claim is about the slots.
  const second = why === -1 ? derivedWhy : why;
  ok(did !== -1 && second !== -1 && cut !== -1,
    `${at}: the rendered row is missing one of the three mechanism labels`);
  if (did === -1 || second === -1 || cut === -1) continue;
  ordered++;
  ok(did < second && second < cut && (cav === -1 || cut < cav),
    `${at}: the multi-issue caveat is printed before the row explains the local link\n` +
    `    (did=${did} why=${second} cut=${cut} caveat=${cav})`);
}
ok(ordered > 40, `only ${ordered} rendered rows were ordering-checked — the row split stopped matching the markup`);

/* ═══════════════════════════════════════════════════════════════════════════
   4 · the sentence earns its slot
   ═══════════════════════════════════════════════════════════════════════════ */
section("4 · the mechanism sentence is not a restatement of the line above it");
for (const r of rows) {
  if (r.d.lane === "record" || !r.d.counts) continue;
  const at = `${r.pid}/${r.key} [${r.d.ident}]`;
  ok(r.d.counts.trim() !== String(r.d.plain || "").trim(),
    `${at}: "why it counts here" repeats "what it did" verbatim`);
  // Both lines quoting the same opening clause reads as a stutter on the row face.
  const head = (s) => String(s).trim().slice(0, 40).toLowerCase();
  ok(head(r.d.counts) !== head(r.d.plain),
    `${at}: both mechanism lines open with the same clause`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5 · a law is called by both its names
   ═══════════════════════════════════════════════════════════════════════════ */
section("5 · the row head names the bill a reader would recognise");
const EXEC = (win.EXEC_ACTIONS && win.EXEC_ACTIONS.trump) || [];
const twoNamed = EXEC.filter((a) => a.documentId && a.measureNumber &&
  a.documentId.indexOf(a.measureNumber) === -1);
ok(twoNamed.length > 0, "no document on file carries both a citation and a measure number");
const seenIdents = new Set(rows.map((r) => r.d.ident));
const hr1 = rows.find((r) => r.key === "edu_college_cost" && r.pid === "trump");
ok(!!hr1, "the flagship case — the reconciliation law on college costs — is no longer on a contradicted row");
if (hr1) {
  ok(hr1.d.ident.indexOf("Public Law 119-21") !== -1 && hr1.d.ident.indexOf("H.R. 1") !== -1,
    `the row head reads "${hr1.d.ident}" — a reader cannot tell which bill this is`);
  ok(/higher education|college/i.test(hr1.d.counts || ""),
    "the flagship row's mechanism sentence never names the promise it is measured against");
}
for (const ident of seenIdents) {
  const src = twoNamed.find((a) => ident.indexOf(a.documentId) === 0);
  if (!src) continue;
  ok(ident.indexOf(src.measureNumber) !== -1,
    `"${ident}": the file carries the measure number ${src.measureNumber} and the row head drops it`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6 · the score path is untouched
   ═══════════════════════════════════════════════════════════════════════════ */
section("6 · prose reaches the row face and nothing else");
// Each gated row's verdict, re-read from the shared row model after the dossier has
// been built. Curated prose that changed a direction would show up here.
for (const r of rows) {
  const live = (CS.issueRows(r.pid) || []).find((x) => x.key === r.key);
  const token = live && live.verdict && live.verdict.token;
  ok(token === r.token,
    `${r.pid}/${r.key}: the row verdict moved to "${token}" — prose is not allowed to move a verdict`);
}
// And the direction line still quotes the chip's own label rather than paraphrasing,
// which is what makes it structurally impossible for the two to disagree. The label
// it quotes is the ITEM's verdict, not the row's: on a Mixed row the whole point is
// that the instruments under it do not all read the same way.
const VERDICTS = CS.VERDICTS || {};
for (const r of rows) {
  if (!r.m.dir) continue;
  const label = (VERDICTS[r.d.verdict] || {}).label;
  if (!label) continue;
  ok(r.m.dir.indexOf(label) !== -1,
    `${r.pid}/${r.key} [${r.d.ident}]: the direction line stopped quoting the chip it sits under`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   7 · the roll-call lane is held to the same gate, at the coverage it reached
   ═══════════════════════════════════════════════════════════════════════════ */
section("7 · judged roll-call acts teach too — or are counted as debt, not waived");
{
  const rec = rows.filter((r) => r.d.lane === "record");
  ok(rec.length > 50,
    `only ${rec.length} judged roll-call acts reached — the offline corpus stopped feeding this file,\n` +
    "    and every assertion in this section is passing on an empty set");
  let curated = 0;
  const openDebt = new Map();
  for (const r of rec) {
    const at = `${r.pid}/${r.key} [${r.d.ident}]`;
    // The two slots are never empty on this lane either — derived counts, blank
    // does not.
    ok((r.m.did || "").trim().length > 0, `${at}: no "what it did" line at all`);
    ok((r.m.counts || "").trim().length > 0, `${at}: no "why it counts here" line at all`);
    if (r.m.countsBy === "curated") {
      curated++;
      ok(!DERIVED.test(r.m.counts), `${at}: rendered as curated but the sentence is the derived restatement`);
      ok(r.d.counts.trim() !== String(r.d.plain || "").trim(),
        `${at}: "why it counts here" repeats "what it did" verbatim`);
    } else {
      const it = r.d.item || {};
      const k = `${it.number}|${it.congress}|${r.key}`;
      openDebt.set(k, (openDebt.get(k) || 0) + 1);
    }
  }
  const rate = rec.length ? curated / rec.length : 0;
  console.log(`   judged roll-call acts: ${rec.length} · curated ${curated} (${Math.round(rate * 100)}%) · ${openDebt.size} (measure, issue) pairs still owed`);
  // A ratchet on the two verdicts a reader comes to argue with. It is not 100%
  // and must not be written as if it were: the measures behind the remainder have
  // no summary text in the repo, so a curator has nothing to write from and a
  // confident sentence there would be invention.
  ok(rate >= 0.7,
    `curated coverage of judged roll-call acts fell to ${Math.round(rate * 100)}% — it was 83% when this gate was written`);
  // Every pair still owed is named, so the debt is a work list rather than a mood.
  const worst = [...openDebt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (worst.length) console.log(`   still owed, worst first: ${worst.map(([k, n]) => `${k} (${n})`).join(" · ")}`);
  // And the debt is bounded by what the repo can actually source. A pair with
  // measure text on file and no curated line is a gap somebody can close today.
  const ident = new Set(JSON.parse(R("db/vr-measure-identity.json")).measures.map((m) => m.number + "|" + m.congress));
  const writable = [...openDebt.keys()].filter((k) => {
    const p = k.split("|");
    return ident.has(p[0] + "|" + p[1]);
  });
  ok(writable.length === 0,
    `${writable.length} judged pair(s) have measure text on file and still render derived — ` +
    `nothing is stopping these being written: ${writable.slice(0, 6).join(", ")}`);
}

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ mechanism completeness: ${fails.length} failed, ${pass} passed\n`);
  fails.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`\n✓ mechanism completeness: all ${pass} assertions passed — ${rows.length} judged instruments; every curated one teaches why it counts and every derived one is counted as debt rather than dressed up as curation`);
