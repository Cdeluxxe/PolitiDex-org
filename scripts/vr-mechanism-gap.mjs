#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Which mapped acts are named but not explained
// ─────────────────────────────────────────────────────────────────────────────
// The Official Record face can be perfectly honest and still teach nothing. A row
// reading "3 votes on file — all 3 cut against" is true, and a reader who opens it
// wants three things it may not have: which three, what each one did on THIS issue,
// and why that lands on this chip. Where curation is missing the renderer says so —
// it derives "what it did" from the question and the ballot and marks the row — and
// that marker is the right behaviour, not the finish line.
//
// This is the census of the gap. It rebuilds the member roll-call lane offline (see
// vr-record-corpus.mjs), runs the shipped dossier over it, and counts the acts whose
// "what it did" and "why it counts here" are derived rather than written.
//
//   node scripts/vr-mechanism-gap.mjs                 # the whole ledger
//   node scripts/vr-mechanism-gap.mjs --member owens  # one profile, row by row
//   node scripts/vr-mechanism-gap.mjs --measures      # by measure, worst first
//
// The count it reports is acts-on-faces, not mappings: one unexplained mapping on a
// bill 40 members voted on is 40 rows a reader can open and 40 places the ledger
// stops teaching. The --measures view is the one to work from, because a single
// curated entry closes every row that shares its (measure, issue).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : (argv[i + 1] || ""); };
const ONE = arg("--member");
const BY_MEASURE = argv.includes("--measures");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
];
const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;
const CS = win.PDXConsistency;

const { byMember, stats } = buildCorpus(ROOT);
console.log(`corpus: ${stats.rolls} roll calls · ${stats.cells} member cells · ${stats.members} members`);

const known = new Set(Object.keys(win.CMP_DATA));
const pids = [...byMember.keys()].filter((p) => known.has(p) && (!ONE || p === ONE));
for (const p of pids) win.PDXVotingRecord.noteMember(p, byMember.get(p));

// The derived fallback's signature on each of the two slots.
const DERIVED_WHY = /^Counted on .+ because that is /;

const acts = [];
for (const pid of pids) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
  for (const r of rows) {
    let items = [];
    try { items = CS.dossierItems(pid, r.key) || []; } catch (e) { continue; }
    const rec = items.filter((d) => d.lane === "record" && !d.held);
    if (!rec.length) continue;
    for (const d of rec) {
      const m = CS.dossierMechanism(d, r.key) || {};
      acts.push({
        pid, key: r.key, label: r.label, verdict: (r.verdict && r.verdict.token) || "",
        ident: d.ident, congress: d.congress || "", multi: !!d.multi,
        curatedDid: !!(d.plain || "").trim(),
        curatedWhy: !!(d.counts || "").trim(),
        emptyDid: !(m.did || "").trim(),
        derivedWhy: DERIVED_WHY.test(m.why || m.counts || ""),
      });
    }
  }
}

const n = acts.length;
const pc = (x) => `${x} (${n ? Math.round((x / n) * 100) : 0}%)`;
console.log(`\nacts on record-lane faces: ${n} across ${new Set(acts.map((a) => a.pid + "/" + a.key)).size} issue rows`);
console.log(`  curated "what it did":        ${pc(acts.filter((a) => a.curatedDid).length)}`);
console.log(`  curated "why it counts here": ${pc(acts.filter((a) => a.curatedWhy).length)}`);
console.log(`  no "what it did" at all:      ${pc(acts.filter((a) => a.emptyDid).length)}`);
console.log(`  multi-issue instruments:      ${pc(acts.filter((a) => a.multi).length)}`);

// Requirement 4's priority order, as a partition of the same population.
const byVerdict = {};
for (const a of acts) {
  const k = a.verdict || "no_stance";
  byVerdict[k] = byVerdict[k] || { n: 0, bare: 0 };
  byVerdict[k].n++; if (!a.curatedWhy) byVerdict[k].bare++;
}
console.log("\nby row verdict — acts / of those, uncurated:");
for (const [k, v] of Object.entries(byVerdict).sort((a, b) => b[1].bare - a[1].bare)) {
  console.log(`  ${k.padEnd(14)} ${String(v.n).padStart(5)} / ${v.bare}`);
}

if (BY_MEASURE) {
  const m = new Map();
  for (const a of acts) {
    if (a.curatedWhy && a.curatedDid) continue;
    const k = `${a.ident}|${a.congress}|${a.key}`;
    const e = m.get(k) || { k, n: 0, key: a.key, label: a.label, ident: a.ident, congress: a.congress };
    e.n++; m.set(k, e);
  }
  const list = [...m.values()].sort((a, b) => b.n - a.n);
  const total = list.reduce((s, e) => s + e.n, 0);
  // Whether the measure has text on file. _DOS_MECH's sourcing law is that an entry
  // is written from the document, so a measure known only by title and roll number
  // cannot get one however many rows it sits on.
  const ident = new Map();
  for (const mm of JSON.parse(R("db/vr-measure-identity.json")).measures) {
    ident.set(String(mm.number).replace(/\s+/g, " ").trim() + "|" + mm.congress, mm);
  }
  if (argv.includes("--dump")) {
    // The authoring worksheet: every uncurated pair with the two sources a
    // _DOS_MECH entry may be written from — the measure's summary on file and the
    // mapping's own rationale — and nothing else.
    const seed = new Map();
    for (const mm of JSON.parse(R("db/vr-issue-seed.json")).measures) {
      seed.set(String(mm.number).replace(/\s+/g, " ").trim() + "|" + mm.congress, mm);
    }
    for (const e of list) {
      const cong = parseInt(String(e.congress), 10);
      const k = String(e.ident).replace(/\s+/g, " ").trim() + "|" + cong;
      const id = ident.get(k), sd = seed.get(k);
      if (!id) continue;
      const map = ((sd && sd.issues) || []).find((x) => x.issueKey === e.key) || {};
      console.log(`\n### ${k}|${e.key}   (${e.n} rows)  ${e.label}`);
      console.log(`TITLE: ${id.officialTitle || id.title}`);
      console.log(`MAP: weight=${map.weight} primary=${!!map.isPrimary} meaning=${map.supportMeaning}`);
      console.log(`RATIONALE: ${map.rationale || "—"}`);
      console.log(`SUMMARY: ${(id.summary || "").replace(/\s+/g, " ")}`);
    }
    process.exit(0);
  }
  console.log(`\nuncurated (measure, issue) pairs: ${list.length} over ${total} rows — closing one closes every row on its line`);
  let run = 0;
  list.forEach((e, i) => {
    run += e.n;
    const cong = parseInt(String(e.congress), 10);
    const has = ident.has(String(e.ident).replace(/\s+/g, " ").trim() + "|" + cong);
    console.log(`  ${String(i + 1).padStart(3)}. ${String(e.n).padStart(4)} rows  ${String(Math.round((run / total) * 100)).padStart(3)}%  ${has ? "text" : "  · "}  ${e.ident} ${e.congress}  →  ${e.label} [${e.key}]`);
  });
}

if (ONE) {
  console.log(`\n${ONE} — record-lane rows`);
  const rows = new Map();
  for (const a of acts) {
    const k = a.key; const e = rows.get(k) || { label: a.label, verdict: a.verdict, acts: [] };
    e.acts.push(a); rows.set(k, e);
  }
  for (const [k, e] of rows) {
    console.log(`\n  ${e.label} [${k}] — ${e.acts.length} acts · ${e.verdict || "no_stance"}`);
    for (const a of e.acts) {
      console.log(`    ${a.curatedDid ? "did✓" : "did·"} ${a.curatedWhy ? "why✓" : "why·"} ${a.multi ? "multi" : "     "}  ${a.ident} ${a.congress}`);
    }
  }
}
