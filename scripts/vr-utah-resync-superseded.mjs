#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-utah-resync-superseded.mjs — re-derive one derived flag after an admit
// ─────────────────────────────────────────────────────────────────────────────
// Every Utah committee vote row carries `supersededByFloorVote`: true when the SAME
// member later cast a floor vote on the SAME bill, so the committee act is not a second
// independent position. scripts/vr-utah-committee-ingest.mjs computes it at ingest time
// from whatever the floor seed could attribute THEN:
//
//     supersededByFloorVote: (floorVoters.get(bill) || new Set()).has(v.politicianId)
//
// The wave-9 name admit attributed 878 floor votes that the ingest had parsed and dropped
// for want of a roster id. That is exactly the input to the line above, so 70 committee
// rows across two sessions were left saying "this member never voted on this bill on the
// floor" about members who demonstrably did.
//
// The flag never reaches the database — no migration writes it and no column holds it —
// and the runtime does not trust it either: voting-record.js recomputes the overlap from
// the floor votes actually present before it counts a committee act. So nothing was
// double counted. What was wrong was the SEED'S OWN DISCLOSURE, and the disclosure is the
// number the ingest report quotes and the committee harness checks. A derived field that
// has stopped agreeing with what it is derived from is a bug whether or not anything
// downstream currently reads it.
//
// This re-derives the per-row flag with the ingest's rule, from the committed floor seeds.
// The seed's two SUMMARY counts are left frozen where they are, because an applied
// migration quotes them in its prose and an applied migration is never edited; the
// re-derived pair is written beside them under its own name instead. It adds no data,
// fetches nothing, touches no field but the flag and those counts, and is a no-op on
// re-run.
//
//   node scripts/vr-utah-resync-superseded.mjs           # report only
//   node scripts/vr-utah-resync-superseded.mjs --write
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const P = (f) => join(ROOT, f);
const J = (f) => JSON.parse(readFileSync(P(f), "utf8"));

const FLOOR = { "2025GS": "db/vr-utah-vote-seed.json", "2024GS": "db/vr-utah-vote-seed-2024GS.json",
                "2023GS": "db/vr-utah-vote-seed-2023GS.json" };
// The ingest-time figures each session's APPLIED migration quotes in its prose, restated
// here so this script restores them rather than trusting whatever is in the file — it has
// to be safe to re-run against a seed a previous run already rewrote.
const FROZEN = {
  "db/vr-utah-committee-seed-2024GS.json": [170, 44],
  "db/vr-utah-committee-seed-2023GS.json": [207, 96],
};
const TARGETS = ["db/vr-utah-committee-seed.json", "db/vr-utah-committee-seed-2024GS.json",
  "db/vr-utah-committee-seed-2023GS.json", "db/vr-utah-committee-mapping-seed-2025GS.json",
  "db/vr-utah-committee-mapping-seed-2024GS.json", "db/vr-utah-committee-mapping-seed-2023GS.json"];

// bill|pid pairs that reached a floor roll, per session — the ingest's `floorVoters`.
const floorPairs = {};
for (const [session, f] of Object.entries(FLOOR)) {
  const s = new Set();
  for (const m of J(f).measures || [])
    for (const rc of m.rollcalls || [])
      for (const v of rc.votes || []) s.add(`${m.utahBill}|${v.politicianId}`);
  floorPairs[session] = s;
}

let totalFlips = 0;
for (const f of TARGETS) {
  if (!existsSync(P(f))) { console.log(`   — ${f} (absent)`); continue; }
  const doc = J(f);
  const session = doc.session;
  const pairs = floorPairs[session];
  if (!pairs) { console.error(`✗ ${f}: names session ${JSON.stringify(session)}, which has no floor seed`); process.exit(1); }
  let sup = 0, flips = 0, rows = 0;
  for (const m of doc.measures || [])
    for (const a of m.committeeActs || [])
      for (const v of a.votes || []) {
        rows++;
        const want = pairs.has(`${m.utahBill}|${v.politicianId}`);
        if (!!v.supersededByFloorVote !== want) { flips++; if (WRITE) v.supersededByFloorVote = want; }
        if (want) sup++;
      }
  const was = doc.counts ? doc.counts.supersededByFloorVote : null;
  console.log(`   ${flips ? "↻" : "·"} ${f.replace("db/", "")}  ${rows} rows · superseded ${was} → ${sup} · ${flips} flag(s) out of step`);
  totalFlips += flips;
  // `counts` is FROZEN. Its two superseded numbers are quoted verbatim in the prose of an
  // APPLIED migration, and an applied migration is never edited — it disclosed what was
  // true when it ran, and rewriting it to match a later truth would make the deploy
  // history a fiction. So the ingest-time figure stays exactly where it is, and the
  // re-derived one is written beside it under its own name. Same split the Utah record
  // harness already uses for the member map's `unmappedThen` versus `unmapped`.
  if (WRITE && doc.counts && FROZEN[f]) {
    doc.counts.supersededByFloorVote = FROZEN[f][0];
    doc.counts.notOnAnyFloorRoll = FROZEN[f][1];
    doc.counts.supersededByFloorVoteNow = sup;
    doc.counts.notOnAnyFloorRollNow = rows - sup;
    doc.counts._nowNote = "supersededByFloorVote/notOnAnyFloorRoll are this session's " +
      "ingest-time figures, quoted in the prose of its applied migration and frozen there. " +
      "The *Now keys are the same two counts re-derived from the committed floor seeds " +
      "after the wave-9 name admit attributed floor votes this session had parsed and " +
      "dropped. The per-row supersededByFloorVote flags are current, not frozen.";
  }
  if (WRITE && (flips || FROZEN[f])) writeFileSync(P(f), JSON.stringify(doc, null, 2) + "\n");
}

if (!WRITE && totalFlips) {
  console.log(`\n   ${totalFlips} flag(s) disagree with the committed floor seeds. Re-run with --write.`);
  process.exit(1);
}
console.log(totalFlips ? `\n✓ re-derived ${totalFlips} flag(s) from the committed floor seeds`
                       : "\n✓ every supersededByFloorVote agrees with the floor seed it is derived from");
