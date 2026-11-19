// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — Senate source layer · Phase 13B scaffold
// ─────────────────────────────────────────────────────────────────────────────
// The Congress.gov API that feeds the House ingest has NO Senate roll-call vote
// resource (`/senate-vote/{congress}` → "Unknown resource"; see db/vr-ingest-
// runbook.md), so the Senate side needs its own source. This module is that source:
// a single seam the ingest calls for `chamber === "senate"` that can be fed EITHER by
//
//   1. a curated seed of real senate.gov roll calls (db/vr-senate-seed.json) — the
//      ACTIVE path today, built + audited by scripts/vr-build-senate-seed.mjs, or
//   2. a live senate.gov roll-call XML fetch — the PLANNED next step, gated OFF
//      behind VR_SENATE_XML and stubbed below (see fetchSenateRollcallsXml).
//
// Both branches return the SAME canonical RawVote[] the House fetcher produces, so
// everything downstream — the idempotent upserts, the curated member map, the issue
// seed, pack refresh, and the read path — treats a Senate roll call exactly like a
// House one. No chamber special-casing lives past this seam.
//
// SAFE + ADDITIVE: the seed is a fixed set of real, sourced votes. Selecting the XML
// path never fabricates — on any gap it degrades to the seed (or []), mirroring the
// House fetcher's defensive posture.

import senateSeed from "../../db/vr-senate-seed.json" with { type: "json" };
import type { RawVote } from "./vr-normalize.js";

type SenateSeed = { votes?: RawVote[] };

export type SenateSourceOpts = {
  congress: number;
  session?: number;
  limit?: number;
  // The live path: Senate roll calls built from the senate.gov XML the
  // vote-actions cron stored (vr-vote-source-db.ts senateRollcallsFromVoteActions).
  stored?: () => Promise<RawVote[]>;
};

// The curated seed → RawVote[]. The JSON is authored in the canonical RawVote shape
// (scripts/vr-build-senate-seed.mjs writes it straight from the official XML), so this
// is a validate-and-passthrough: enforce the same verifiability gate the ingest does
// (a roll call AND its measure must each carry a source URL), filter to the requested
// congress, then newest-first and cap to `limit`.
function fetchSenateRollcallsSeed(opts: SenateSourceOpts): RawVote[] {
  const all = ((senateSeed as SenateSeed).votes || []) as RawVote[];
  const limit = Math.min(Math.max(opts.limit || 20, 1), 250);
  return all
    .filter((v) => v && v.congress === opts.congress)
    .filter((v) => !!v.sourceUrl && !!v.measure?.sourceUrl) // verifiability
    .sort((a, b) => new Date(b.voteDate).getTime() - new Date(a.voteDate).getTime())
    .slice(0, limit);
}

// ── Live senate.gov roll-call XML (VR_SENATE_XML=1) ───────────────────────────
// Off by default. IMPLEMENTED by reading what the vote-actions cron already
// fetched: it pulls the menu + every vote document, keeps each unmodified in
// Blobs "raw-ingest-votes", and resolves LIS ids to bioguide through
// congress-legislators. The caller passes that read in as opts.stored, and the
// member positions are then taken from pdx_vote_actions (vr-vote-source.ts),
// so this path fetches nothing and parses no member list of its own.
// The original plan, for the record — it would have pulled the
// Senate's own roll-call XML — the vote menu
//   https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_{c}_{s}.xml
// then each vote document
//   https://www.senate.gov/legislative/LIS/roll_call_votes/vote{c}{s}/vote_{c}_{s}_{NNNNN}.xml
// and normalize them into RawVote[] just like the seed. The one extra step the House
// path doesn't need: senate.gov identifies members by name/state (no bioguide), so
// this must resolve each member against db/vr-member-map.json's (last name, state)
// index before the map can attribute the vote — exactly what the seed builder already
// does offline. Until that resolver + measure→issue curation are wired for arbitrary
// votes, this returns [] so the ingest cleanly falls back to the curated seed. It is
// scaffolded here (not omitted) so the seam and its contract are already in place.
async function fetchSenateRollcallsXml(opts: SenateSourceOpts): Promise<RawVote[]> {
  if (!opts.stored) {
    console.log("vr-senate-source: VR_SENATE_XML set but no stored-XML reader was passed — using curated seed.");
    return [];
  }
  return (await opts.stored()).filter((v) => v && v.congress === opts.congress && !!v.sourceUrl && !!v.measure?.sourceUrl);
}

// Seed + live, one RawVote per roll call. A roll call in both keeps the SEED's
// measure and roll-call text (curated identity and title), so the live path
// never opens a second measure row for a seeded vote; member positions for
// both are overlaid from pdx_vote_actions afterwards either way.
export function mergeSenateRollcalls(seed: RawVote[], live: RawVote[], limit: number): RawVote[] {
  const key = (v: RawVote) => `${v.congress}|${v.session}|${v.rollNumber}`;
  const seen = new Set(seed.map(key));
  return [...seed, ...live.filter((v) => !seen.has(key(v)))]
    .sort((a, b) => new Date(b.voteDate).getTime() - new Date(a.voteDate).getTime())
    .slice(0, limit);
}

// The single entry point the ingest calls for the Senate. The curated seed always;
// with VR_SENATE_XML=1, plus the stored live roll calls the seed does not carry.
export async function fetchSenateRollcalls(opts: SenateSourceOpts): Promise<RawVote[]> {
  const seed = fetchSenateRollcallsSeed(opts);
  if (process.env.VR_SENATE_XML === "1") {
    try {
      const live = await fetchSenateRollcallsXml(opts);
      if (live.length) return mergeSenateRollcalls(seed, live, Math.min(Math.max(opts.limit || 20, 1), 250));
    } catch (e: any) {
      console.warn("vr-senate-source: stored XML read failed, falling back to seed —", e?.message || String(e));
    }
  }
  return seed;
}
