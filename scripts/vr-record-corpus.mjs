#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The member roll-call lane, offline
// ─────────────────────────────────────────────────────────────────────────────
// The record lane is an API in a live browser: consistency.js reads it out of
// PDXVotingRecord's cache, which /api/voting-record fills. In node that cache is
// cold, so every harness and audit that wants to see a REAL record row has had to
// hand-write two or three votes as fixtures. That is fine for a rule and useless
// for a census — "which mapped acts on which issue rows teach the reader nothing"
// is a question about the whole corpus or it is not a question.
//
// This module rebuilds the corpus from the shipped seeds:
//
//   db/vr-*-vote-seed.json, db/vr-house-seed-*.json, db/vr-senate-seed.json,
//   db/vr-*-backfill-seed.json   →  roll calls + per-member cells
//   db/vr-issue-seed.json        →  the measure→issue mappings the API joins on
//   db/vr-measure-identity.json  →  titles, where a seed carries only a number
//
// and packs each member's items in the SAME shape netlify/functions/voting-record.mts
// returns — its RecordItem type, its PROCEDURAL_TYPES list, its yeaBlocksMeasure
// rule — so what the renderer sees here is what a browser sees there.
//
// It is a projection, not the database. Rows the ingest declined, corrections
// applied after a seed was cut, and anything added straight to the live tables are
// not here. It is honest about scale, not about any single member's exact ballot.
//
//   import { buildCorpus } from "./vr-record-corpus.mjs";
//   const { byMember, measures } = buildCorpus(ROOT);
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// vr-pack.ts's two rules, quoted rather than re-invented (see its header for why).
const PROCEDURAL_TYPES = ["procedural", "motion"];
const yeaBlocksMeasure = (q) => {
  const s = String(q || "").toLowerCase();
  return s.indexOf("recommit") !== -1 || s.indexOf("to commit") !== -1 || s.indexOf("to table") !== -1;
};

const norm = (n) => String(n || "").replace(/\s+/g, " ").trim();

export function buildCorpus(ROOT) {
  const J = (f) => JSON.parse(readFileSync(join(ROOT, "db", f), "utf8"));

  // ── the mapping table: measure (number, congress) → issues ─────────────────
  // Keyed by both, because bill numbers are reused every two years and a 117th
  // Congress H.R. 1 is not a 119th Congress H.R. 1.
  const issuesBy = new Map();
  const seedMeasures = new Map();
  for (const m of J("vr-issue-seed.json").measures) {
    const k = norm(m.number) + "|" + m.congress;
    seedMeasures.set(k, m);
    issuesBy.set(k, (m.issues || []).map((i) => ({
      issueKey: i.issueKey, weight: i.weight == null ? 100 : i.weight,
      isPrimary: !!i.isPrimary, supportMeaning: i.supportMeaning,
      rationale: i.rationale || null,
    })));
  }
  const identity = new Map();
  for (const m of J("vr-measure-identity.json").measures) {
    identity.set(norm(m.number) + "|" + m.congress, m);
  }

  // ── every seed file that carries roll calls with member cells ──────────────
  const files = readdirSync(join(ROOT, "db"))
    .filter((f) => /^vr-.*seed.*\.json$/.test(f) && f !== "vr-issue-seed.json");

  // One roll call, one entry — but UNION the member cells, never the first file wins.
  // Several seeds overlap by design: a topic seed cut for an issue wave and the
  // chamber-wide window seed both carry the same roll, and they do not carry the same
  // roster (one was pulled for a roster wave, the other for a date window). The real
  // ingest reconciles them on (chamber, congress, session, roll) and keeps every cell.
  // Deduping the roll by dropping the later copy would throw away real ballots; not
  // deduping at all inflates every count read off the list, while the renderer's own
  // dedupe quietly hides the copy. So: seen rolls are remembered, and their cells are
  // merged into the member lists that already hold the first copy.
  const seenRoll = new Map(); // roll key → Set of politicianIds already recorded
  const byMember = new Map();
  const measures = new Map(); // key → { number, congress, title, rolls }
  let rolls = 0, cells = 0, unmapped = 0;

  for (const f of files) {
    let doc; try { doc = J(f); } catch (e) { continue; }
    const votes = Array.isArray(doc.votes) ? doc.votes : [];
    for (const v of votes) {
      const mo = (v.measure && typeof v.measure === "object") ? v.measure : null;
      const number = norm(mo ? mo.number : v.measure);
      const congress = (mo && mo.congress) || v.congress || doc.congress || null;
      if (!number || !congress) continue;
      const key = number + "|" + congress;
      const issues = issuesBy.get(key);
      if (!issues || !issues.length) { unmapped++; continue; } // the API joins; no mapping, no issue row
      const ident = identity.get(key), sm = seedMeasures.get(key);
      const title = (mo && mo.title) || (ident && ident.title) || (sm && sm.title) || number;
      const rk = [(mo && mo.chamber) || v.chamber || doc.chamber || "", congress,
        v.session || doc.session || "", v.rollNumber].join("|");
      const already = seenRoll.get(rk) || null;
      const cellSeen = already || new Set();
      if (!already) { seenRoll.set(rk, cellSeen); rolls++; }
      const actionType = v.actionType || "passage";
      const rec = measures.get(key) || { number, congress, title, rolls: 0, issues };
      if (!already) rec.rolls++;
      measures.set(key, rec);

      for (const c of (v.memberVotes || [])) {
        const pid = c.politicianId;
        if (!pid || !c.position) continue;
        if (cellSeen.has(pid)) continue;
        cellSeen.add(pid);
        cells++;
        const list = byMember.get(pid) || [];
        list.push({
          kind: "vote",
          measureId: key, measureType: (mo && mo.measureType) || v.measureType || "bill",
          number, title,
          chamber: (mo && mo.chamber) || v.chamber || doc.chamber || null,
          status: (sm && sm.status) || "",
          date: v.voteDate ? new Date(v.voteDate).toISOString() : null,
          action: v.question || null,
          actionType,
          position: c.position,
          result: v.result || null,
          isParty: c.isParty || null,
          supports: null,
          isProcedural: PROCEDURAL_TYPES.indexOf(actionType) !== -1,
          advanceInverted: yeaBlocksMeasure(v.question),
          isAmendment: ((mo && mo.measureType) || v.measureType) === "amendment",
          parentMeasureId: null,
          rollcallId: v.rollNumber || null,
          congress, session: v.session || doc.session || null,
          rollNumber: v.rollNumber || null,
          issues,
          source: { url: v.sourceUrl || (mo && mo.sourceUrl) || "", label: v.sourceLabel || "U.S. House Clerk" },
        });
        byMember.set(pid, list);
      }
    }
  }
  return { byMember, measures, stats: { files: files.length, rolls, cells, unmapped, members: byMember.size } };
}
