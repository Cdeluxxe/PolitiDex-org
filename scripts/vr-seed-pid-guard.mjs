// ─────────────────────────────────────────────────────────────────────────────
// Seed → member-map agreement guard for the vote-migration generators
// ─────────────────────────────────────────────────────────────────────────────
//
// A vote seed's `politicianId` is a CACHED RESOLUTION, not a source. Each
// memberVotes row records both the Bioguide ID it came from and the politician_id
// db/vr-member-map.json resolved that Bioguide to AT PULL TIME. The Bioguide is the
// fact; the pid is a lookup result that can go stale the moment the map is corrected.
//
// A stale pid is exactly how one member's votes end up published under another
// member's name. That is not hypothetical. db/vr-house-seed-119-s2.json pairs
// "bioguideId": "K000404" (Del. Kimberlyn King-Hinds, MP) with "politicianId":
// "kennedy" (Rep. Mike Kennedy, UT-03) on 24 rows, and db/vr-israel-vote-seed.json
// carries a 25th, because the curated portrait the map is derived from pointed at the
// wrong Bioguide file. 20260815000000_vr_fix_kennedy_identity_collision.sql deletes
// those rows from the database; re-running a generator over the unrepaired seeds
// would have emitted a new migration that wrote every one of them straight back.
//
// So the generators refuse rather than repair:
//
//   • Silently re-resolving from the Bioguide would emit a migration whose rows
//     disagree with the seed it says it was generated from — the seed and the
//     migration would tell different stories about the same roll call.
//   • Silently dropping the row would quietly shrink a window the seed presents as
//     a complete chamber tally, and is_party was computed against that full tally.
//
// A mismatch means the seed needs re-pulling under the corrected map. That is a
// deliberate act, upstream of code generation, and it belongs to an operator.
//
// scripts/vr-gen-senate-migration.mjs does not need this guard: it resolves each pid
// from the Bioguide through the map at generation time and drops unmapped members, so
// its output cannot outlive a map correction. The seeds it reads carry no cached pid.

/**
 * Verify every seeded member vote's (bioguideId → politicianId) pair still agrees
 * with db/vr-member-map.json. Writes a report to stderr and exits 1 on disagreement.
 *
 * @param {object} seed      parsed vote seed, shape { votes: [{ memberVotes: [...] }] }
 * @param {object} memberMap parsed db/vr-member-map.json
 * @param {string} seedPath  repo-relative seed path, for the error message
 */
export function assertSeedPidsMatchMap(seed, memberMap, seedPath) {
  const map = memberMap.map || {};
  const stale = [];
  const unresolvable = [];
  let checked = 0;

  for (const v of seed.votes || []) {
    for (const r of v.memberVotes || []) {
      // No cached pid means nothing can be stale — the generator resolves this row
      // from the Bioguide itself, which is always current.
      if (r.politicianId == null) continue;
      const where = `${v.chamber || "?"} ${v.congress ?? "?"}/${v.session ?? "?"} roll ${v.rollNumber}`;
      if (!r.bioguideId) {
        // A pid with no Bioguide behind it cannot be re-checked here at all. Name it
        // rather than counting it as agreement, so the guard never reads as broader
        // than it is.
        unresolvable.push(`${where} '${r.politicianId}' carries no bioguideId`);
        continue;
      }
      checked++;
      const expected = Object.prototype.hasOwnProperty.call(map, r.bioguideId) ? map[r.bioguideId] : null;
      if (expected === r.politicianId) continue;
      stale.push(
        `${where}: ${r.bioguideId} → seed says '${r.politicianId}', ` +
        `map says ${expected === null ? "no roster slug" : `'${expected}'`}`
      );
    }
  }

  if (stale.length) {
    const shown = stale.slice(0, 12);
    process.stderr.write(
      `\n${seedPath}: ${stale.length} member vote row(s) name a politician_id that ` +
      `db/vr-member-map.json no longer resolves that Bioguide ID to.\n` +
      `Generating from this seed would attribute votes to the wrong member. Re-pull the ` +
      `seed against the current map before regenerating.\n\n  ` +
      shown.join("\n  ") +
      (stale.length > shown.length ? `\n  … and ${stale.length - shown.length} more` : "") +
      "\n\n"
    );
    process.exit(1);
  }

  if (unresolvable.length) {
    process.stderr.write(
      `note: ${unresolvable.length} row(s) carry a politician_id with no bioguideId and ` +
      `could not be cross-checked (e.g. ${unresolvable[0]})\n`
    );
  }
  return { checked, unresolvable: unresolvable.length };
}
