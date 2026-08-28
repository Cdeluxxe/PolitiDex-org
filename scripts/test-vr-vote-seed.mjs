#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — vote-seed discipline
// ---------------------------------------------------------------------------
// A vote seed (`db/*-vote-seed.json`) is the deploy-time twin of a roll-call ingest:
// the migration writes exactly what the seed holds, and `scripts/vr-coverage-report.mjs`
// overlays the seed so a committed-but-undeployed pass is counted honestly. Both of
// those only hold if the seed itself obeys the rules the runbook records, so this test
// checks them mechanically rather than by review:
//
//   * Attribution is fail-closed. Every member-vote names a bioguide id, and that id
//     maps to its `politicianId` through `db/vr-member-map.json` and nowhere else.
//     No slug may appear that the roster map does not produce, and none may disagree
//     with the bioguide it is attached to — an ingest that guesses one member scores
//     the wrong person forever.
//   * Only decisive questions are ingested (runbook rule 8). Cloture motions, motions
//     to table and budget-point-of-order waivers say nothing about whether a member
//     supports what a bill does, so a seed carrying one is a bug, not a judgement call.
//     Two question forms outside that list are admitted, each gated on the measure's
//     shape and each required to carry its own written justification — see EXCEPTIONS.
//   * The roster is the ceiling, not the chamber. `totals` must be the FULL chamber
//     tally, so it always exceeds the attributed count — if a 220-211 vote were stored
//     as 33-0 the margin shown to a reader would be a fiction.
//   * Every measure a seed votes on is mapped in `db/vr-issue-seed.json`, or the votes
//     land unrankable and the ingest moved nothing.
//   * Roll calls are unique on the key `vr_rollcalls` is itself unique on, so the
//     migration's ON CONFLICT DO NOTHING cannot be hiding a collision inside one pass.
//   * Every seeded roll call is actually written by a migration. The seed is a mirror,
//     not a source — a roll that lives only in the seed would be counted as pending by
//     the coverage report forever and never reach the database.
//
// FEDERAL SEEDS ONLY. Every rule above names something only Congress has, so a state
// legislature's seed is routed out of this pass — and required to be named by a test
// of its own rather than dropped. See the split at `isFederalSeed` below.
//
// Read-only. No database, no network.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
let pass = 0;
const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };

const MEMBER_MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-member-map.json'), 'utf8')).map || {};
const SLUGS = new Set(Object.values(MEMBER_MAP));

const ISSUE_SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'vr-issue-seed.json'), 'utf8'));
const mkey = (congress, number) => `${congress}|${String(number || '').toLowerCase().replace(/[.\s]/g, '')}`;
const MAPPED = new Set((ISSUE_SEED.measures || [])
  .filter(m => Array.isArray(m.issues) && m.issues.length)
  .map(m => mkey(m.congress, m.number)));

// A vote that decided the substance: final passage, a motion to concur, or a conference
// report. Deliberately narrow — anything else needs its own mapping before its own roll.
const DECISIVE = /^(on passage|on the motion \(motion to concur|on motion to concur|on concurring|on the conference report|on motion to suspend the rules and (pass|agree|concur))/i;

// ── PASSAGE FORMS ───────────────────────────────────────────────────────────
// DECISIVE is written around the caption the two chambers use for a bill. The Senate does
// not use it for every measure shape: it disposes of a joint resolution as "On the Joint
// Resolution H.J.Res. NN", which is the up-or-down vote on the text itself — the same act
// DECISIVE already admits under "On Passage", spelled differently. So these are passage,
// not exceptions, and they carry no argumentative burden. Each is still gated on the
// measure shape, so the caption alone can never admit a roll on something else. Nothing
// procedural wears this caption: motions arrive as "On the Motion to …" and cloture as
// "On Cloture Motion", and both stay out.
const PASSAGE_FORMS = [
  { name: 'joint resolution', question: /^on the joint resolution\b/i, number: /^(h|s)\.j\.\s*res\./i },
];

// ── EXCEPTIONS ──────────────────────────────────────────────────────────────
// Two question forms sit outside DECISIVE while still being the whole substantive record
// of what they decide. Each is admitted for ONE measure shape, so the caption alone can
// never let a roll through, and each must ship a `decisiveWhy` on the vote — the reason
// travels with the data instead of living only in a reviewer's memory.
//
//   amendment  "On Agreeing to the Amendment" (House) or "On the Amendment" (Senate) on an
//              H.Amdt./S.Amdt. measure — one act under two clerks' captions. An amendment
//              never gets a passage vote; agreeing to it IS its disposition, and the
//              alternative is a permanently unscoreable class of directional floor votes.
//   discharge  "On the Motion to Discharge" on a joint resolution. Under the Arms Export
//              Control Act's expedited procedure a disapproval resolution the Foreign
//              Relations Committee has not reported reaches the floor only by discharge,
//              and no such motion has ever carried — senators debate the arms sale itself
//              and vote it up or down under this caption. Treating it as procedure would
//              mean the Senate has no record on arms sales at all.
//
// Motions to recommit, motions to table, cloture and previous-question votes stay out.
// Note how narrow the gate is: "On the Motion to Discharge" on a BILL still fails, because
// there the discharge really is a step toward a later passage vote.
const EXCEPTIONS = [
  { name: 'amendment', question: /^on (agreeing to )?the amendment\b/i, number: /^(h|s)\.\s*amdt\./i },
  { name: 'discharge', question: /^on the motion to discharge/i, number: /^(h|s)\.j\.\s*res\./i },
];

const POSITIONS = new Set(['yea', 'nay', 'present', 'not_voting']);
const PARTY_FLAGS = new Set(['with_party', 'against_party', null, undefined]);

const allSeedFiles = fs.readdirSync(path.join(ROOT, 'db')).filter(f => /-vote-seed\.json$/.test(f)).sort();

// ── FEDERAL SEEDS ONLY, AND THE SPLIT IS DECLARED RATHER THAN SILENT ────────
// Every rule in the header above is a rule about CONGRESS: a bioguide id, a
// Congress number, a session that is 1 or 2, a chamber that is 'house' or
// 'senate', a mapping in db/vr-issue-seed.json. A state legislature has none of
// those — Utah has no bioguide, no Congress and a chamber string that carries the
// jurisdiction ('utah house'), and its measures are mapped in their own curated
// file. Running these checks over a state seed does not find bugs; it reports the
// shape difference 30 times.
//
// So the pass is split, and the state half is not skipped quietly: a state seed
// must be named by a test of its own, and that is asserted here. A file matching
// `*-vote-seed.json` that NOTHING guards still fails, which is the property worth
// keeping. `scripts/test-vr-utah-record.mjs` is the Utah guard.
const isFederalSeed = (f) => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', f), 'utf8'));
    return Array.isArray(j.votes);
  } catch (e) { return true; } // a seed that does not parse is caught by the pass below
};
const seedFiles = allSeedFiles.filter(isFederalSeed);
const stateSeeds = allSeedFiles.filter((f) => !isFederalSeed(f));
ok(seedFiles.length > 0, 'no federal db/*-vote-seed.json found — this test has nothing to guard');
if (stateSeeds.length) {
  const harnesses = fs.readdirSync(path.join(ROOT, 'scripts'))
    .filter((f) => /^test-.*\.mjs$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8')).join('\n');
  for (const f of stateSeeds) {
    ok(harnesses.includes(`db/${f}`),
      `db/${f} is not the federal seed shape and no scripts/test-*.mjs names it — ` +
      'a seed nothing guards is a seed nobody has read');
  }
}

// Every applied migration, concatenated. Roll calls are looked up in here by the tuple
// the insert writes, so the check does not care which migration carries which roll.
const MIG_DIR = path.join(ROOT, 'netlify', 'database', 'migrations');
const MIGRATIONS = fs.existsSync(MIG_DIR)
  ? fs.readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort()
      .map(f => fs.readFileSync(path.join(MIG_DIR, f), 'utf8')).join('\n')
  : '';
ok(MIGRATIONS.length > 0, 'no migrations found — cannot check that seeded rolls are written anywhere');

let totalRolls = 0;
let totalMv = 0;

for (const file of seedFiles) {
  const label = `db/${file}`;
  let seed;
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', file), 'utf8')); }
  catch (e) { fails.push(`${label}: does not parse — ${e.message}`); continue; }

  const votes = Array.isArray(seed.votes) ? seed.votes : [];
  ok(votes.length > 0, `${label}: carries no votes`);

  // Declared counts must match the contents, or a truncated write goes unnoticed.
  if (typeof seed.rollCallCount === 'number') {
    ok(seed.rollCallCount === votes.length,
      `${label}: rollCallCount says ${seed.rollCallCount}, file holds ${votes.length}`);
  }
  const mvCount = votes.reduce((a, v) => a + (v.memberVotes || []).length, 0);
  if (typeof seed.memberVoteCount === 'number') {
    ok(seed.memberVoteCount === mvCount,
      `${label}: memberVoteCount says ${seed.memberVoteCount}, file holds ${mvCount}`);
  }

  const seenRolls = new Set();
  for (const v of votes) {
    const at = `${label} ${v.chamber}/${v.congress}-${v.session}/roll ${v.rollNumber}`;

    // ── the vr_rollcalls unique key, enforced inside the pass too ──────────
    const rk = `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
    ok(!seenRolls.has(rk), `${at}: duplicated within the seed — one of the two would be silently dropped`);
    seenRolls.add(rk);

    ok(v.chamber === 'house' || v.chamber === 'senate', `${at}: chamber is not house/senate`);
    ok(Number.isInteger(v.congress) && v.congress > 0, `${at}: congress is not a positive integer`);
    ok(v.session === 1 || v.session === 2, `${at}: session is not 1 or 2`);
    ok(Number.isInteger(v.rollNumber) && v.rollNumber > 0, `${at}: rollNumber is not a positive integer`);

    // ── a seeded roll must be written by a migration, not only mirrored here ──
    // Two independent patterns, because either alone is satisfiable by something that is
    // not an insert: the tuple must appear in an `INSERT INTO vr_rollcalls` VALUES row
    // (which always leads with the measure variable), and the roll must be looked back up
    // so its id can carry the member votes.
    const inserted = new RegExp(
      `VALUES \\([^)\\n]*,\\s*'${v.chamber}',\\s*${v.congress},\\s*${v.session},\\s*${v.rollNumber},`
    ).test(MIGRATIONS);
    const lookedUp = new RegExp(
      `chamber\\s*=\\s*'${v.chamber}'\\s+AND\\s+congress\\s*=\\s*${v.congress}\\s+AND\\s+session\\s*=\\s*${v.session}\\s+AND\\s+roll_number\\s*=\\s*${v.rollNumber}\\b`
    ).test(MIGRATIONS);
    ok(inserted && lookedUp,
      `${at}: no migration writes this roll call — a seed-only roll is counted as pending forever`);
    ok(/^\d{4}-\d{2}-\d{2}T/.test(String(v.voteDate)), `${at}: voteDate is not an ISO timestamp`);
    ok(/^https:\/\/\S+$/.test(String(v.sourceUrl)), `${at}: sourceUrl is not an https URL`);
    ok(typeof v.sourceLabel === 'string' && v.sourceLabel.length > 0, `${at}: no sourceLabel`);

    // ── the measure must be mapped, or the refusal must be written down ───
    // A roll on an unmapped measure ranks nothing, so the default is still a
    // failure. But "unmapped" and "unread" are not the same state: a measure can
    // be read in full and refused every candidate key on the merits, which is a
    // curatorial finding worth keeping rather than a gap to be closed by mapping
    // it anyway. H.R. 1069 is that case — nine keys read and nine refused in F1,
    // re-refused in F2, and a migration that RAISES if it ever gains an issue row.
    //
    // So the exemption is allowed and made expensive. The seed must name the
    // measure in measuresDeliberatelyUnmapped AND argue it in declinedFacets, key
    // by key, or the roll fails exactly as before. A one-line assertion buys
    // nothing; a bare `measuresDeliberatelyUnmapped` entry with no facet behind it
    // is still a hole, and still fails here.
    const m = v.measure || {};
    ok(!!m.number && !!m.chamber && Number.isInteger(m.congress), `${at}: measure is not fully identified`);
    const declaredUnmapped = (seed.measuresDeliberatelyUnmapped || [])
      .some((d) => String(d).includes(String(m.number)));
    const facetsRefused = (seed.declinedFacets || [])
      .filter((d) => String(d.measure || '').includes(String(m.number)))
      .filter((d) => typeof d.why === 'string' && d.why.trim().length >= 24);
    if (MAPPED.has(mkey(m.congress, m.number))) {
      pass++;
    } else {
      ok(declaredUnmapped && facetsRefused.length > 0,
        `${at}: measure ${m.number} (${m.congress}th) has no mapping in db/vr-issue-seed.json `
        + 'and is not declared in measuresDeliberatelyUnmapped with a reasoned declinedFacets '
        + 'entry behind it — an unmapped measure is either a refusal on the record or a hole');
    }

    // ── runbook rule 8: decisive questions only ───────────────────────────
    const question = String(v.question || '');
    const num = String(m.number || '');
    const passageForm = PASSAGE_FORMS.find(p => p.question.test(question) && p.number.test(num));
    const exception = EXCEPTIONS.find(e => e.question.test(question) && e.number.test(num));
    ok(DECISIVE.test(question) || !!passageForm || !!exception,
      `${at}: question "${v.question}" is not a decisive vote — procedural rolls are not scoreable`);
    // An exception is a judgement about one measure shape, so it has to be argued in the
    // seed. Without this the two patterns would quietly widen into a loophole: any roll
    // captioned "On Agreeing to the Amendment" would pass review by matching a regex.
    if (exception && !DECISIVE.test(question) && !passageForm) {
      ok(typeof v.decisiveWhy === 'string' && v.decisiveWhy.trim().length >= 24,
        `${at}: admitted under the ${exception.name} exception but carries no decisiveWhy — `
        + 'a non-passage question is only scoreable if the seed states why it decided the substance');
    }

    // ── the roster is the ceiling, not the chamber ────────────────────────
    // What this catches is a seed whose `totals` were copied off the roster subset
    // instead of the chamber, which would make a 96-member slice look like the
    // whole Senate. The comparison has to be like-for-like to catch it: an
    // attributed member-vote may be yea, nay, present OR not_voting, so the
    // ceiling is the chamber's HEADCOUNT — every position summed — and not its
    // yea/nay tally. Comparing the roster's rows against yea+nay alone failed a
    // seed that was right: Senate 119/1/632 is 49-45 with 6 not voting, 100
    // senators, and its 96 attributed rows include those 6.
    //
    // Checking each position against its own chamber count is what makes this
    // strict rather than merely looser: 50 attributed yeas under a printed
    // yea of 49 is impossible however the totals were assembled, and is now
    // caught per position instead of hiding inside a sum.
    const mvs = Array.isArray(v.memberVotes) ? v.memberVotes : [];
    ok(mvs.length > 0, `${at}: no attributed member-votes`);
    const t = v.totals || {};
    const tallied = (t.yea || 0) + (t.nay || 0);
    ok(tallied > 0, `${at}: totals carry no yea/nay tally`);
    const headcount = tallied + (t.present || 0) + (t.notVoting || 0);
    ok(headcount >= mvs.length,
      `${at}: totals (${t.yea}-${t.nay}, ${t.present || 0} present, ${t.notVoting || 0} not voting) `
      + `count ${headcount} members, fewer than the ${mvs.length} attributed votes — `
      + 'totals must be the full chamber tally, not the roster subset');
    const CEILING = { yea: t.yea || 0, nay: t.nay || 0, present: t.present || 0, not_voting: t.notVoting || 0 };
    const attributedBy = { yea: 0, nay: 0, present: 0, not_voting: 0 };
    for (const mv of mvs) {
      if (Object.hasOwn(attributedBy, mv.position)) attributedBy[mv.position]++;
    }
    for (const [position, n] of Object.entries(attributedBy)) {
      ok(n <= CEILING[position],
        `${at}: ${n} attributed "${position}" votes under a printed ${position} count of `
        + `${CEILING[position]} — the roster cannot hold more of a position than the chamber cast`);
    }

    // ── attribution is fail-closed ────────────────────────────────────────
    const seenPids = new Set();
    for (const mv of mvs) {
      const who = `${at} ${mv.bioguideId || '(no bioguide)'}`;
      ok(!!mv.bioguideId, `${who}: member-vote carries no bioguideId`);
      ok(MEMBER_MAP[mv.bioguideId] !== undefined,
        `${who}: bioguide is not in db/vr-member-map.json — unknown members are skipped, never guessed`);
      ok(MEMBER_MAP[mv.bioguideId] === mv.politicianId,
        `${who}: attributed to "${mv.politicianId}" but the roster map says `
        + `"${MEMBER_MAP[mv.bioguideId]}" — a mis-attribution scores the wrong person`);
      ok(SLUGS.has(mv.politicianId), `${who}: "${mv.politicianId}" is not a roster slug`);
      ok(POSITIONS.has(mv.position), `${who}: position "${mv.position}" is not one of ${[...POSITIONS].join('/')}`);
      ok(PARTY_FLAGS.has(mv.isParty ?? null), `${who}: isParty "${mv.isParty}" is not with_party/against_party/null`);
      // vr_member_votes is unique on (rollcall_id, politician_id).
      ok(!seenPids.has(mv.politicianId), `${who}: appears twice on the same roll call`);
      seenPids.add(mv.politicianId);
    }
    totalMv += mvs.length;
    totalRolls++;
  }

  // Declined rolls are a ledger, not a formality: each needs a stated reason, so a
  // skip can never read as an oversight.
  for (const d of (seed.declinedRollCalls || [])) {
    ok(typeof d.why === 'string' && d.why.length >= 12,
      `${label}: declined roll ${d.number}/${d.roll} has no explained reason`);
  }
}

if (fails.length) {
  console.error(`✗ vote-seed discipline: ${fails.length} failure(s)`);
  for (const f of fails.slice(0, 40)) console.error(`  - ${f}`);
  if (fails.length > 40) console.error(`  … ${fails.length - 40} more`);
  process.exit(1);
}
console.log(`✓ vote-seed discipline: all ${pass} assertions passed`);
console.log(`  ${seedFiles.length} seed file(s) · ${totalRolls} roll calls · ${totalMv} member-votes, `
  + `every one attributed through db/vr-member-map.json`);
