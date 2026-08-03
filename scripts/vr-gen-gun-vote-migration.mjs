#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-gun-vote-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-gun-vote-seed.json plus the matching rows in db/vr-issue-seed.json into a
// forward-only migration for the two firearms facets, `gun_rights` and `gun_safety`. The
// seed is the mirror; this file is the source of truth for what reaches the database.
//
//   node scripts/vr-gen-gun-vote-migration.mjs > netlify/database/migrations/<ts>_vr_gun_facet_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · Every measure here is CREATED, not looked up — none of the eight is live. The insert
//     is guarded by a SELECT so a re-run is a no-op, and each lookup and insert is keyed on
//     (congress, chamber, number) rather than number alone, because H.R. 8 and H.R. 1 mean
//     different bills in different Congresses and vr_measures carries no unique index on
//     (congress, number).
//   · The amendment is inserted AFTER its parent and carries parent_id, so
//     S.Amdt. 1354 nests under H.R. 4366 in the UI the way H.Amdt. 253 nests under
//     H.R. 8800. The parent is created deliberately WITHOUT an issue mapping: a vote on a
//     three-division appropriations act is not a firearms position, which is why only the
//     amendment roll is ingested and the omnibus passage vote is declined.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the tables are
//     themselves unique on, so the whole migration is idempotent.
//   · Issue rows come verbatim from db/vr-issue-seed.json, each with its provision-level
//     rationale and a primary source — scripts/test-mapping-discipline.mjs requires both.
//
// WHAT THIS MIGRATION DOES NOT TOUCH
// ----------------------------------
// Three firearms measures were already mapped before this pass: H.R. 1181 and H.Amdt. 253
// (gun_rights) and S. 2938 (gun_safety AND gun_rights in opposite directions). All three
// were reviewed here and left exactly as they are, and the review is recorded in the
// seed's declinedFacets so a one-facet mapping never reads as an oversight. This migration
// adds a vertical; it does not re-file published data. S. 2938's own rolls are already
// live from db/vr-phase-a-vote-seed.json and are not re-emitted.
//
// ROW SCOPE IS STATED AS DATA, NOT INFERRED
// -----------------------------------------
// PASS_ROLLS below is the frozen list of the nine rolls this migration published. A
// generator whose output silently widens over its own applied migration invites exactly
// the mistake the runbook forbids — regenerating a file the database has already run — so
// a later roll added to the seed is NOT picked up here and gets its own forward migration.
// The seed's narrative fields (scanCoverage, enactedLawFinding) do track the seed, so a
// re-run reflects a later correction to the prose while the row scope stays frozen.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-gun-vote-seed.json";
const seedFile = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].sort();

const PASS_ROLLS = new Set([
  "house|117|1|75",    // H.R. 8 — Bipartisan Background Checks Act
  "house|117|1|77",    // H.R. 1446 — Enhanced Background Checks Act
  "house|117|2|245",   // H.R. 7910 — Protecting Our Kids Act
  "house|117|2|255",   // H.R. 2377 — Federal Extreme Risk Protection Order Act
  "house|117|2|410",   // H.R. 1808 — Assault Weapons Ban of 2022
  "house|118|1|252",   // H.J.Res. 44 — stabilizing braces CRA (House)
  "senate|118|1|171",  // H.J.Res. 44 — stabilizing braces CRA (Senate, defeated)
  "senate|118|1|268",  // S.Amdt. 1354 — Kennedy VA/NICS amendment (enacted)
  "house|119|2|190",   // H.R. 1041 — Veterans 2nd Amendment Protection Act
]);
const rkey = (v) => `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
const passVotes = (seedFile.votes || []).filter((v) => PASS_ROLLS.has(rkey(v)));
const seed = {
  ...seedFile,
  votes: passVotes,
  rollCallCount: passVotes.length,
  memberVoteCount: passVotes.reduce((n, v) => n + (v.memberVotes || []).length, 0),
};
if (passVotes.length !== PASS_ROLLS.size) {
  throw new Error(
    `${SEED_PATH} no longer carries all ${PASS_ROLLS.size} rolls this migration published `
    + `(found ${passVotes.length}) — the applied file cannot be reproduced from it.`
  );
}

// The seed's politician_id is a cached map lookup, not a source. Refuse to generate from a
// seed whose (bioguideId → politicianId) pairs the current map contradicts.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const num = (n) => n.toLocaleString("en-US");
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) =>
  `${congress}|${chamber}|${String(number || "").toLowerCase().replace(/[.\s]/g, "")}`;

const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const issuesFor = (m) => {
  const e = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl || null } : { issues: [], sourceUrl: null };
};

// Measures in emission order. A parent is emitted BEFORE the child that references it, so
// the child's INSERT can carry parent_id from an already-populated variable.
const measures = [];
const seenMeasure = new Set();
const pushMeasure = (m, extra) => {
  const k = ikey(m.congress, m.chamber, m.number);
  if (seenMeasure.has(k)) return;
  seenMeasure.add(k);
  measures.push({ ...m, ...(extra || {}), var: varName(m) });
};
for (const v of seed.votes) {
  const m = v.measure;
  if (m.parentCreate) {
    pushMeasure(m.parentCreate, { create: m.parentCreate, isParent: true });
    pushMeasure(m, { parentVar: varName(m.parentCreate) });
  } else {
    pushMeasure(m);
  }
}

const out = [];
const w = (s = "") => out.push(s);
// Wrap a long prose paragraph into SQL comment lines. The justifications here are the
// reason a mapping exists at all, so a reader of the migration gets all of one or the
// comment is theatre.
const wrap = (text, prefix = "-- ", cont = null) => {
  const contPrefix = cont == null ? prefix : cont;
  let line = "";
  let first = true;
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > 86) {
      w((first ? prefix : contPrefix) + line);
      first = false;
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) w((first ? prefix : contPrefix) + line);
};
const wrapBullet = (text) => wrap("· " + text, "-- ", "--   ");

const facetRows = (key) => measures.reduce((n, m) => n + issuesFor(m).issues.filter((i) => i.issueKey === key).length, 0);
const rightsRows = facetRows("gun_rights");
const safetyRows = facetRows("gun_safety");

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Firearms — the floor record for two facets, 117th-119th Congress");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-gun-vote-migration.mjs from db/vr-gun-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls · ${num(seed.memberVoteCount)} attributed member votes · ${num(measures.length)} measures`);
w(`-- ${rightsRows} gun_rights mapping(s) · ${safetyRows} gun_safety mapping(s)`);
w("--");
w("-- TWO FACETS, NOT ONE AXIS");
wrap("Firearms policy is modelled as two independent facets rather than a single left-right "
  + "chip, and the two keys were already in ISSUE_MAP: gun_rights covers carry and "
  + "self-defence rights, Second Amendment protections against registry, purchase-tracking "
  + "and licensing burdens, and opposition to broad category bans on commonly-owned firearms "
  + "or magazines; gun_safety covers background checks, red-flag and extreme-risk orders, "
  + "assault-style and high-capacity restrictions, safe storage, and trafficking and "
  + "straw-purchase enforcement. A member may support both, oppose both, or split them, and "
  + "nothing in the scoring couples them. The legacy middle key gun_balance is NOT a facet — "
  + "its chip asserts a position on both axes at once, which is the thing the split exists to "
  + "avoid — and no card or mapping was re-keyed off it.");
w("--");
w("-- DIRECTION IS CODED AGAINST EACH CHIP'S OWN SENTENCE");
wrap("On gun_rights, yea_supports means the vote widened, or refused to narrow, the scope of "
  + "the individual right. On gun_safety, yea_supports means it tightened a rule aimed at "
  + "misuse. Six of the eight mapped measures carry BOTH facets with OPPOSITE support_meaning "
  + "— that is not a contradiction, it is the two-facet model doing the thing it exists to do. "
  + "The two facets are not mirror images either: weights below 100 on a secondary facet are "
  + "provision arithmetic, not hedging. H.R. 7910 is gun_rights yea_opposes at 80 because two "
  + "of its six operative titles — trafficking enforcement and safe storage — take nothing "
  + "away from an eligible adult while three plainly do.");
w("--");
w("-- THE ENACTED-LAW TIER");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- FACETS DECLINED, AND MAPPINGS REVIEWED AND LEFT ALONE");
for (const d of seed.declinedFacets || []) {
  wrapBullet(`${d.measure}${d.facet ? ` — ${d.facet} NOT mapped: ` : " — "}${d.why}`);
}
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
for (const d of seed.declinedRollCalls || []) {
  const where = [d.chamber, d.congress && d.session ? `${d.congress}/${d.session}` : null, d.roll ? `roll ${d.roll}` : null]
    .filter(Boolean).join(" ");
  wrapBullet(`${d.number}${where ? ` ${where}` : ""} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- ONE AMENDMENT ROLL, ADMITTED BY EXCEPTION");
for (const v of seed.votes.filter((x) => x.decisiveWhy)) {
  wrap(`${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} (${v.measure.number}, `
    + `${v.totals.yea}-${v.totals.nay} ${v.result}): ${v.decisiveWhy}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("House rolls attribute on the bioguide id in the Clerk's XML against "
  + "db/vr-member-map.json — a direct lookup, and an unmapped member is skipped and counted, "
  + "never guessed. Senate XML carries no bioguide id, so a senator resolves on (surname, "
  + "state) against the roster and only a UNIQUE hit is accepted; an ambiguous match is "
  + "counted and skipped. The surname compare anchors on the tail of the roster name rather "
  + "than splitting on the last word, because the Senate writes <last_name>Van "
  + "Hollen</last_name>. totals is the FULL chamber tally and is_party is computed from the "
  + "full recorded vote before the roster filter, so a partial roster cannot invent a margin "
  + "or a party crossover. Every roll is re-verified against the chamber's own document "
  + "before ingest: <legis-num> plus <vote-question> for the House, document_type and "
  + "document_number plus question for a Senate bill or joint resolution, and "
  + "amendment_number plus amendment_to_document_number for the amendment — the Senate leaves "
  + "document_number EMPTY on an amendment vote, so checking only the document fields would "
  + "have accepted any amendment roll on any vehicle.");
w("--");
wrap("Idempotent: every write is guarded, and a re-run is a no-op. All eight measures are new "
  + "— none of them was live before this migration. The three firearms measures that WERE "
  + "already mapped (H.R. 1181, H.Amdt. 253, S. 2938) are not touched here.");
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
for (const m of measures) w(`  ${m.var} integer;`);
w("  rc integer;");
w("BEGIN");
w();

// ── measures ────────────────────────────────────────────────────────────────
w("  -- ── measures ──────────────────────────────────────────────────────────────");
for (const m of measures) {
  const c = m.create || m.parentCreate || null;
  const title = (c && c.title) || m.title;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${title ? " — " + title : ""}`);
  if (m.isParent) {
    w("  --   Parent vehicle only. Created so the amendment below can nest under it; it carries");
    w("  --   NO issue mapping, because a vote on a multi-division appropriations act is not a");
    w("  --   firearms position.");
  }
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  w(`  IF ${m.var} IS NULL THEN`);
  const cols = "measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids"
    + (m.parentVar ? ", parent_id" : "");
  w(`    INSERT INTO vr_measures (${cols})`);
  w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
  w(`      ${q(c.summary)},`);
  w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb${m.parentVar ? `, ${m.parentVar}` : ""})`);
  w(`    RETURNING id INTO ${m.var};`);
  if (m.parentVar) {
    // A re-run over a row an earlier pass created without the link still gets the link,
    // which is what the amendment-parent backfill migration exists to do generally.
    w("  ELSE");
    w(`    UPDATE vr_measures SET parent_id = ${m.parentVar}, updated_at = now()`);
    w(`     WHERE id = ${m.var} AND parent_id IS NULL;`);
  }
  w("  END IF;");
  w();
}

// ── roll calls and member votes ─────────────────────────────────────────────
w("  -- ── roll calls and member votes ───────────────────────────────────────────");
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} voting members are on the roster; ${v.rosterSkipped} skipped as unmapped`
    + `${v.rosterAmbiguous ? `, ${v.rosterAmbiguous} skipped as an ambiguous surname match` : ""}`);
  if (v.voteDesc && v.voteDesc !== v.measure.title) {
    w(`  --   chamber vote description reads "${v.voteDesc}"`);
  }
  if (v.decisiveWhy) w("  --   admitted as decisive BY EXCEPTION — see the header.");
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Gun facets: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the provision-level rationale and a primary");
w("  -- source on every row — scripts/test-mapping-discipline.mjs requires both.");
let mappedRows = 0;
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  if (!issues.length) {
    w(`  -- ${m.number} (${m.congress}th): deliberately unmapped — see the header.`);
    w();
    continue;
  }
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(issues.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  }).join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "the gun_rights rows earlier passes wrote for H.R. 1181, H.Amdt. 253 and S. 2938 and stop "
  + "meaning anything.");
w("--");
wrap("The orphan check covers all nine rolls, not a subset: every one of them is created here, "
  + "so every member vote on them came through db/vr-member-map.json and a politician_id from "
  + "outside the map would be a real defect rather than an earlier pass's wider attribution "
  + "path.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_rights integer;");
w("  n_safety integer;");
w("  n_parent integer;");
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), mine (congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${m.congress}::integer, '${m.chamber}'::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.congress = k.congress AND m.chamber = k.chamber AND m.number = k.number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + ROSTER.map((s) => q(s)).join(", "));
w("            )),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'gun_rights'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids)),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'gun_safety'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids)),");
w("         (SELECT count(*) FROM vr_measures a");
w("            JOIN vr_measures p ON p.id = a.parent_id");
w("           WHERE a.congress = 118 AND a.chamber = 'senate' AND a.number = 'S.Amdt. 1354'");
w("             AND p.congress = 118 AND p.chamber = 'house' AND p.number = 'H.R. 4366')");
w("    INTO n_rolls, n_votes, n_orphan, n_rights, n_safety, n_parent;");
w();
w("  RAISE NOTICE 'Gun facets: % roll calls, % member votes, % gun_rights and % gun_safety mappings', n_rolls, n_votes, n_rights, n_safety;");
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Gun facets: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Gun facets: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Gun facets: % member vote(s) on these roll calls carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_rights <> ${rightsRows} THEN`);
w(`    RAISE EXCEPTION 'Gun facets: expected ${rightsRows} gun_rights mappings on this pass''s measures, found %', n_rights;`);
w("  END IF;");
w(`  IF n_safety <> ${safetyRows} THEN`);
w(`    RAISE EXCEPTION 'Gun facets: expected ${safetyRows} gun_safety mappings on this pass''s measures, found %', n_safety;`);
w("  END IF;");
w("  IF n_parent <> 1 THEN");
w("    RAISE EXCEPTION 'Gun facets: S.Amdt. 1354 is not linked to its H.R. 4366 parent (found % link(s))', n_parent;");
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls · ${seed.memberVoteCount} member votes · ${measures.length} measures `
  + `(${measures.filter((m) => m.isParent).length} parent vehicle, unmapped) · ${mappedRows} issue rows `
  + `(${rightsRows} gun_rights, ${safetyRows} gun_safety) · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
