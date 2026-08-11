#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ✒️ Executive Enactment Record — Phase 1 guards: the vocabulary cannot drift
// ─────────────────────────────────────────────────────────────────────────────
// The EER is the second record lane, for figures who cast no congressional floor
// votes. Its whole claim to honesty rests on things it must NEVER say and NEVER do,
// and every one of those is the kind of rule that erodes silently under later edits.
// So they are gated here rather than left as comments:
//
//   1. No vote language, and no graded adjectives, anywhere in the EER vocabulary.
//      "Mostly acted on it" is a percentage wearing a word — it would pass every
//      numeric check while reintroducing the invented denominator the no-score rule
//      removed from the math.
//   2. No percentage character, anywhere.
//   3. The framing clause is the literal LEAD of every label, not a suffix.
//   4. Issue-unit and document-unit buckets stay distinguishable, because the units
//      are shipped as data — that is what makes "never add these two totals" a
//      mechanical check instead of a review habit.
//   5. No executive pid appears in db/vr-member-map.json. If one ever did, the vr_*
//      ingest could attribute a roll call to a president and manufacture exactly the
//      fake "Voted Yea/Nay" framing this lane exists to prevent.
//   6. The forbidden-word matcher is scoped to EER strings ONLY — consistency.js
//      legitimately labels a verdict "Mixed record" — and is proven non-vacuous.
//
//   node scripts/test-exec-vocab.mjs
//
// No database, no network, no DOM. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (p) => readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(readText(p));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const TYPES = readJson("db/exec-action-types.json");
const SUMKEYS = readJson("db/exec-summary-keys.json");
const ISSUE_KEYS = new Set(readJson("db/issue-keys.json").keys);

// ── Load the shipped lane in a DOM-less sandbox ──────────────────────────────
const ctx = { console, JSON, Math, Date, setTimeout, clearTimeout };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.runInContext(readFileSync(join(ROOT, "exec-record.js"), "utf8"),
  vm.createContext(ctx), { filename: "exec-record.js" });
const EX = ctx.window.PDXExecRecord;
ok(!!EX, "exec-record.js did not expose window.PDXExecRecord");
if (!EX) { console.error("✗ fatal: no PDXExecRecord"); process.exit(1); }

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The forbidden-vocabulary matcher, taken from the SHIPPED rule
// ─────────────────────────────────────────────────────────────────────────────
const FORBIDDEN = new RegExp(SUMKEYS.forbidden.pattern, SUMKEYS.forbidden.flags);

// Non-vacuity, both directions. This matters more than it looks: the pattern
// deliberately includes `consistent` and `mixed`, which are LEGITIMATE tokens in
// consistency.js's VERDICTS table for the 🏛️ lane. If a later edit weakened the
// pattern to stop it colliding with that lane, every check below would still pass
// while enforcing nothing. So: prove it fires on real vote-shaped copy, and prove
// it is not being applied to the lane where that copy belongs.
ok(FORBIDDEN.test("Mixed record"), "matcher is vacuous: it does not fire on 'Mixed record'");
ok(FORBIDDEN.test("Voted Yea"), "matcher is vacuous: it does not fire on 'Voted Yea'");
ok(FORBIDDEN.test("mostly acted on it"), "matcher is vacuous: it does not fire on 'mostly'");
ok(FORBIDDEN.test("71%"), "matcher is vacuous: it does not fire on a percentage");
ok(FORBIDDEN.test("the majority of orders"), "matcher is vacuous: it does not fire on 'majority'");
// …and prove the scoping is real: the congressional lane's own vocabulary WOULD be
// flagged, which is precisely why this matcher must never be pointed at it.
const consistencySrc = readFileSync(join(ROOT, "consistency.js"), "utf8");
ok(/label:\s*'Mixed record'/.test(consistencySrc),
  "consistency.js no longer labels a verdict 'Mixed record' — re-check that the EER matcher is still correctly scoped away from the 🏛️ lane");

// Every string this lane can render must survive it.
const execStrings = [];
const harvest = (obj, path) => {
  for (const [k, v] of Object.entries(obj || {})) {
    if (k.startsWith("_")) continue;              // _why / _note commentary is not rendered
    if (typeof v === "string") execStrings.push([`${path}.${k}`, v]);
    else if (v && typeof v === "object") harvest(v, `${path}.${k}`);
  }
};
harvest(EX.SCOPE, "SCOPE");
harvest(EX.VERDICTS, "VERDICTS");
harvest(EX.STANDING, "STANDING");
harvest(EX.CLASSES, "CLASSES");
// The coverage gate renders prose on the same surface as the counts, so its wording
// is subject to the same rules — a banner reading "coverage is weak" would smuggle a
// graded adjective back onto a lane that forbids them.
harvest(EX.COVERAGE, "COVERAGE");
execStrings.push(["FRAMING", EX.FRAMING]);
harvest(SUMKEYS.buckets, "summaryKeys.buckets");
harvest(SUMKEYS.labelTemplates, "summaryKeys.labelTemplates");
harvest(TYPES.actionClasses, "actionTypes.actionClasses");

ok(execStrings.length > 40, `only ${execStrings.length} EER strings harvested — did the vocabulary shape change?`);
for (const [where, s] of execStrings) {
  const m = s.match(FORBIDDEN);
  ok(!m, `${where} uses forbidden EER vocabulary ${m ? JSON.stringify(m[0]) : ""}: ${JSON.stringify(s)}`);
}

// The class VERBS are the one place a vote word would be most natural and most wrong.
for (const c of Object.values(EX.CLASSES)) {
  ok(!/\bvot/i.test(c.verb), `action class verb uses vote language: ${c.verb}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · No token collision with the 🏛️ lane
// ─────────────────────────────────────────────────────────────────────────────
// EXEC_VERDICTS must share no token with VERDICTS. Reusing 'consistent' /
// 'contradicts' would make the two lanes indistinguishable to any downstream
// consumer switching on a token.
const CONGRESS_TOKENS = new Set(["consistent", "contradicts", "mixed", "flag", "limited", "pending"]);
for (const k of Object.keys(EX.VERDICTS)) {
  ok(!CONGRESS_TOKENS.has(k), `EXEC_VERDICTS reuses the 🏛️ lane's token "${k}"`);
}
// no_record / no_stance-shaped tokens are allowed to rhyme, but the LABELS must not
// be identical or a screenshot of one lane reads as the other.
ok(EX.VERDICTS.no_record.label !== "No record yet",
  "EXEC_VERDICTS.no_record reuses the congressional label verbatim");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The framing clause leads
// ─────────────────────────────────────────────────────────────────────────────
eq(EX.FRAMING, SUMKEYS.framing, "exec-record.js FRAMING has drifted from db/exec-summary-keys.json");
eq(EX.FRAMING, "Of the formal actions on file", "the locked framing literal changed");
ok(SUMKEYS.labelTemplates.coverage.startsWith("{framing}"),
  "the coverage template no longer LEADS with the framing clause");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Bucket units are shipped as data and stay separate
// ─────────────────────────────────────────────────────────────────────────────
eq(SUMKEYS.buckets.issues.unit, "issue", "issue buckets lost their unit");
eq(SUMKEYS.buckets.actions.unit, "document", "action buckets lost their unit");
ok(SUMKEYS.buckets.issues.unit !== SUMKEYS.buckets.actions.unit,
  "the two bucket families now share a unit — the never-add-these-totals rule is unenforceable");

// Every bucket declares a label, and the coverage buckets are marked as coverage so
// no renderer can present them as findings.
for (const [fam, def] of Object.entries(SUMKEYS.buckets)) {
  for (const [k, b] of Object.entries(def.keys)) {
    ok(!!b.label, `${fam}.${k} has no label`);
    ok(typeof b.token === "string" && b.token.length > 0, `${fam}.${k} has no token`);
  }
}
ok(SUMKEYS.buckets.issues.keys.noActionFound.isCoverage === true,
  "noActionFound is not marked isCoverage — it could be rendered as a negative finding");
ok(SUMKEYS.buckets.issues.keys.noActionFound.negative === false,
  "noActionFound is marked negative; it is coverage, not a finding");
ok(SUMKEYS.buckets.issues.keys.noStance.isCoverage === true, "noStance is not marked isCoverage");

// The bucket tokens and the shipped verdict/standing tables must be the same set —
// a bucket with no verdict behind it can never be filled, and a verdict with no
// bucket would be silently uncounted.
const issueTokens = Object.values(SUMKEYS.buckets.issues.keys).map((b) => b.token).sort();
const verdictTokens = Object.keys(EX.VERDICTS).filter((k) => k !== "no_record").sort();
eq(issueTokens.join(","), verdictTokens.join(","),
  "issue buckets and EXEC_VERDICTS have drifted apart");
const standingTokens = Object.values(SUMKEYS.buckets.actions.keys).map((b) => b.token).sort();
eq(standingTokens.join(","), Object.keys(EX.STANDING).sort().join(","),
  "action buckets and EXEC_STANDING have drifted apart");

// Sticky standings — the ones that keep the standing clause in every rendering —
// must match the contested flags, or a contested record could render as settled.
const contested = Object.values(EX.STANDING).filter((s) => s.contested).map((s) => s.key).sort();
eq(contested.join(","), Object.keys(EX.STANDING_STICKY).sort().join(","),
  "STANDING_STICKY has drifted from the contested standings");
eq(contested.join(","), [...SUMKEYS.standingAlwaysVisibleWhen]
  .map((k) => SUMKEYS.buckets.actions.keys[k].token).sort().join(","),
  "db/exec-summary-keys.json standingAlwaysVisibleWhen has drifted from the contested standings");

// ─────────────────────────────────────────────────────────────────────────────
// 4b · challenged_unverified — the token for a live challenge with no ruling read
// ─────────────────────────────────────────────────────────────────────────────
// The parity checks above prove it is wired in. These prove it MEANS what it was
// added to mean, which parity cannot: a token can be perfectly wired and still be
// the wrong shape. Its whole purpose is to stop a challenged action being filed as
// `in_force` — `in_force` is a positive claim that nothing has disturbed the action,
// and a court that has not ruled has not established that.
const CHU = EX.STANDING.challenged_unverified;
ok(!!CHU, "challenged_unverified is missing from EXEC_STANDING — a live challenge has nowhere honest to go");
if (CHU) {
  ok(CHU.contested === true,
    "challenged_unverified is not contested — the standing clause would drop out of the compact rendering and the record would read as settled");
  ok(CHU.isCoverage === true,
    "challenged_unverified is not marked isCoverage — it reports the state of our file, like said_not_done, and must never render as a finding against the action");
  ok(!!EX.STANDING_STICKY.challenged_unverified, "challenged_unverified is not sticky");
  // A borrowed colour is a borrowed claim: the in-force green says a court left the
  // action alone and the blocked red says a court stopped it, and neither happened.
  const otherCls = Object.values(EX.STANDING).filter((s) => s.key !== CHU.key).map((s) => s.cls);
  ok(!otherCls.includes(CHU.cls), `challenged_unverified shares its class "${CHU.cls}" with another standing`);
  ok(new RegExp("\\." + CHU.cls.replace(/^exec-/, "pdxer-") + "\\{").test(readText("exec-record-ui.js")),
    `exec-record-ui.js has no style rule for ${CHU.cls.replace(/^exec-/, "pdxer-")} — the chip would render unstyled`);
  // The label has to carry the limit, not just the accusation. "Challenged in court"
  // on its own reads as a finding; what makes it honest is the second half.
  ok(/challeng/i.test(CHU.label), "challenged_unverified's label does not say it is challenged");
  ok(/no ruling|not verified|unresolved/i.test(CHU.label),
    `challenged_unverified's label states the challenge without stating the limit ("${CHU.label}")`);
  ok(!FORBIDDEN.test(CHU.label), `challenged_unverified's label uses forbidden vocabulary ("${CHU.label}")`);
  eq(CHU.label.toLowerCase(), SUMKEYS.buckets.actions.keys.challengedUnverified.label.toLowerCase(),
    "the shipped label and the summary-key label for challenged_unverified have drifted apart");
  // It ranks above in_force and below the rulings at issue level: an unresolved
  // challenge must not be summarised away as operative, and must not outrank a court
  // that actually acted.
  const rank = readText("exec-record.js").match(/var order = \[([\s\S]*?)\];/);
  const ordered = rank ? [...rank[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [];
  ok(ordered.indexOf("challenged_unverified") >= 0, "challenged_unverified is absent from the issue-level standing ranking");
  ok(ordered.indexOf("challenged_unverified") < ordered.indexOf("in_force"),
    "challenged_unverified ranks below in_force — an issue with a live challenge could present as operative");
  for (const stronger of ["struck_down", "blocked", "partly_blocked"]) {
    ok(ordered.indexOf(stronger) < ordered.indexOf("challenged_unverified"),
      `challenged_unverified outranks ${stronger} — a pending challenge would hide a ruling that already happened`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · No executive pid may be roll-call attributable
// ─────────────────────────────────────────────────────────────────────────────
const memberMap = readJson("db/vr-member-map.json");
const mapped = new Set(Object.values(memberMap.map || {}).map((v) => (typeof v === "string" ? v : v && v.pid)));
ok(mapped.size > 0, "db/vr-member-map.json yielded no slugs — the cross-check would be vacuous");
for (const pid of EX.pids()) {
  ok(!mapped.has(pid),
    `executive pid "${pid}" is in db/vr-member-map.json — the vr_* ingest could attribute a roll call to them, which is the one change that manufactures a fake "Voted Yea/Nay"`);
  ok(EX.eligible(pid), `EX.pids() lists "${pid}" but eligible() rejects it`);
}
ok(!EX.eligible("marie_gluesenkamp_perez"), "eligible() accepted a sitting member of Congress");
ok(!EX.eligible(""), "eligible() accepted an empty pid");
ok(!EX.eligible("not_a_real_pid"), "eligible() accepted an unknown pid — the gate must fail closed");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · The source rule fails closed
// ─────────────────────────────────────────────────────────────────────────────
// Most rejected examples below are in the app's LIVE curated data today, which is why
// the rule exists at all rather than being a theoretical nicety. The parentheses name
// the live offender and are re-checked when cards move: the circular-stance cleanup
// re-sourced cut_spending and tariffs_growth to the 2024 platform and healthcare_costs
// to the Public Papers, so the fact-sheet shape now has no live instance — it stays in
// the list because a fact sheet is what a presidential stance card reaches for first.
const BAD = [
  ["https://www.congress.gov/", "bare host root (the lower_taxes item)"],
  ["https://www.whitehouse.gov/presidential-actions/", "directory index (tariffs_prices)"],
  ["https://www.whitehouse.gov/fact-sheets/2025/02/fact-sheet-president-donald-j-trump", "fact sheet (no live instance since the cleanup)"],
  ["http://www.federalregister.gov/documents/2025/01/01/x", "plain http"],
  ["//www.federalregister.gov/documents/2025/01/01/x", "protocol-relative"],
  ["", "empty"],
  [null, "null"],
];
for (const [url, why] of BAD) ok(!EX.sourceOk(url), `sourceOk accepted a ${why}: ${JSON.stringify(url)}`);

const GOOD = [
  "https://www.congress.gov/bill/119th-congress/senate-bill/5",
  "https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy",
  "https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf",
];
for (const url of GOOD) ok(EX.sourceOk(url), `sourceOk rejected a valid primary source: ${url}`);

// The shipped JSON patterns and the shipped code must agree, or the documented rule
// and the enforced rule are two different rules.
for (const pat of TYPES.sourceRule.rejectedUrlPatterns) {
  ok(typeof pat === "string" && pat.length > 0, "empty rejectedUrlPattern");
}
ok(TYPES.sourceRule.rejectedUrlPatterns.some((p) => /presidential-actions/.test(p)),
  "db/exec-action-types.json no longer rejects the presidential-actions index");
ok(TYPES.sourceRule.rejectedUrlPatterns.some((p) => /fact-sheet/.test(p)),
  "db/exec-action-types.json no longer rejects fact sheets");

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Action classes: authorship never merges
// ─────────────────────────────────────────────────────────────────────────────
eq(Object.keys(EX.CLASSES).sort().join(","), Object.keys(TYPES.actionClasses).sort().join(","),
  "exec-record.js CLASSES and db/exec-action-types.json have drifted apart");
const shared = Object.values(TYPES.actionClasses).filter((c) => c.authorship === "shared").map((c) => c.label);
const sole = Object.values(TYPES.actionClasses).filter((c) => c.authorship === "sole").map((c) => c.label);
ok(shared.length >= 2 && sole.length >= 2,
  "action classes no longer distinguish shared authorship from sole authorship");
for (const c of Object.values(TYPES.actionClasses)) {
  ok(!!c.sourceOfRecord, `${c.label} has no declared source of record`);
  ok(Array.isArray(c.sourceHosts) && c.sourceHosts.length > 0, `${c.label} has no source hosts`);
}
// Orders cite the Federal Register, not the White House — whitehouse.gov paths are
// reorganised between administrations, so they cannot be the citation of record.
for (const k of ["executive_order", "directive"]) {
  ok(TYPES.actionClasses[k].sourceHosts.some((h) => /federalregister\.gov$/.test(h)),
    `${k} no longer cites the Federal Register as its source of record`);
  ok(!TYPES.actionClasses[k].sourceHosts.some((h) => /whitehouse\.gov$/.test(h)),
    `${k} lists whitehouse.gov as a source of record — it is reorganised between administrations`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8 · The schema/migration/Function guards are actually in place
// ─────────────────────────────────────────────────────────────────────────────
// Resolved by name, not by a literal path: this migration is a drizzle-shaped
// directory (migration.sql + snapshot.json) whose version prefix has to be re-picked
// whenever it sorts behind an already-applied migration, and a hardcoded filename
// turns that routine re-version into a failing suite.
const MIGRATIONS = join(ROOT, "netlify/database/migrations");
const migrationEntries = readdirSync(MIGRATIONS);
const execMigrationDir = migrationEntries.find((f) => /^\d+_create_vr_exec_action_status$/.test(f));
ok(!!execMigrationDir, "no *_create_vr_exec_action_status migration directory found");
if (!execMigrationDir) {
  console.error("✗ exec vocabulary: the standing-log migration is missing entirely");
  process.exit(1);
}
// Drizzle diffs the newest snapshot to build the next migration, so the snapshot has
// to travel with the SQL. A bare .sql would leave the chain unaware of the new table
// and the next generate would try to create it a second time.
for (const part of ["migration.sql", "snapshot.json"]) {
  ok(existsSync(join(MIGRATIONS, execMigrationDir, part)),
    `${execMigrationDir} is missing ${part}`);
}

// The platform rejects a deploy when a pending migration's version prefix sorts
// BEFORE one already applied to the branch, and `drizzle-kit generate` stamps the
// wall-clock date — which sorts behind this repo's hand-versioned migrations, since
// those run ahead of the calendar. So the version has to be picked, not inherited.
//
// What can be asserted offline is DEPENDENCY ORDER, which is permanent. An earlier
// revision of this check required the standing-log migration to be the newest in the
// tree; that was true on the day it was written and false the moment Phase 3 added
// the seed behind it, so it failed on a correct change. The checks below hold no
// matter how many migrations arrive later:
//   • no two migrations share a version — a tie has no defined apply order;
//   • the standing log is created AFTER vr_positions, which it has an FK to;
//   • the Phase 3 seed runs AFTER the table it inserts into.
const versionOf = (f) => (f.match(/^(\d+)/) || [])[1] || "";
const allVersions = migrationEntries.map(versionOf).filter(Boolean);
ok(new Set(allVersions).size === allVersions.length,
  "two migrations share a version prefix — the apply order between them is undefined");

const execVersion = versionOf(execMigrationDir);
// Migrations come in two shapes in this repo — a bare .sql for seeds and repairs, a
// drizzle-shaped directory for anything that creates a table — so the body has to be
// resolved through both before it can be searched.
const bodyOf = (entry) => {
  for (const p of [join(MIGRATIONS, entry), join(MIGRATIONS, entry, "migration.sql")]) {
    try { if (statSync(p).isFile()) return readFileSync(p, "utf8"); } catch (e) { /* next shape */ }
  }
  return "";
};
const positionsMigration = migrationEntries
  .find((f) => /CREATE TABLE IF NOT EXISTS "vr_positions"/.test(bodyOf(f)));
if (positionsMigration) {
  ok(versionOf(positionsMigration) < execVersion,
    `${execMigrationDir} sorts before the migration that creates vr_positions — its foreign key would not resolve`);
}
const seedMigration = migrationEntries.find((f) => /_seed_exec_actions_wave1\.sql$/.test(f));
ok(!!seedMigration, "no *_seed_exec_actions_wave1.sql migration found — Phase 3 seeds the standing log");
if (seedMigration) {
  ok(execVersion < versionOf(seedMigration),
    `the Phase 3 seed (${seedMigration}) sorts before the migration that creates vr_exec_action_status — ` +
    "it would insert into a table that does not exist yet");
}

const migration = readFileSync(join(MIGRATIONS, execMigrationDir, "migration.sql"), "utf8");
ok(/CREATE TABLE IF NOT EXISTS "vr_exec_action_status"/.test(migration),
  "the standing-log migration is not idempotent (missing IF NOT EXISTS)");
ok(/"source_url" text NOT NULL/.test(migration) && /"source_label" text NOT NULL/.test(migration),
  'vr_exec_action_status allows an unsourced status — "struck down" without a ruling must not be publishable');
// (position_id, effective_at) — column order and direction match db/schema.ts:997 and
// the migration's own snapshot.json. Deliberately ASC, not DESC: Postgres scans a
// btree backwards just as cheaply, so "latest row per position" is still an index
// lookup, and matching the snapshot keeps the next drizzle diff from seeing drift.
ok(/vr_exec_action_status_position_idx[\s\S]*?"position_id", "effective_at"/.test(migration),
  "the (position_id, effective_at) index is missing — current-standing resolution would scan per action");
ok(!/"effective_at" DESC/.test(migration),
  "the index declares effective_at DESC but db/schema.ts and snapshot.json record ASC — " +
  "the next drizzle-kit diff would see an index it did not generate");
// Anchored to statement-initial DDL/DML: a referential `ON DELETE CASCADE` clause is
// part of the additive CREATE and must not be mistaken for a mutation. This is also
// why the foreign key is declared inline rather than as drizzle's separate
// `ALTER TABLE … ADD CONSTRAINT` — inline keeps the whole migration one additive
// statement, so this guard stays meaningful instead of having to carve out an
// exception for the FK.
ok(!/^\s*(UPDATE|DELETE\s+FROM|DROP|ALTER\s+TABLE|TRUNCATE)\b/im.test(migration),
  "the standing-log migration mutates existing state; it must be purely additive");
ok(/ON DELETE CASCADE/.test(migration),
  "the standing log no longer cascades from vr_positions — orphan status rows could outlive their action");
// The constraint name is drizzle's, not Postgres's default for an inline REFERENCES,
// so it matches what snapshot.json records for this migration.
ok(/CONSTRAINT "vr_exec_action_status_position_id_vr_positions_id_fkey"/.test(migration),
  "the foreign key is not named to match snapshot.json — an unnamed inline REFERENCES " +
  "would be created as vr_exec_action_status_position_id_fkey and read as drift");

const schema = readFileSync(join(ROOT, "db/schema.ts"), "utf8");
ok(/export const vrExecActionStatus = pgTable\(/.test(schema),
  "db/schema.ts has no vrExecActionStatus table");
ok(/vr_exec_action_status/.test(schema), "db/schema.ts does not name the table");

const fn = readFileSync(join(ROOT, "netlify/functions/voting-record.mts"), "utf8");
ok(/const CHAMBERS = \[[^\]]*"executive"/.test(fn),
  "the Function does not accept chamber=executive");
for (const t of TYPES.measureTypes) {
  ok(new RegExp(`"${t}"`).test(fn), `the Function does not accept measure type "${t}"`);
}
// Widening a filter allow-list must not have narrowed it: the pre-existing values
// have to survive.
for (const t of ["bill", "resolution", "amendment", "nomination", "litigation"]) {
  ok(new RegExp(`"${t}"`).test(fn), `the Function no longer accepts the pre-existing measure type "${t}"`);
}
for (const c of ["house", "senate", "joint", "court"]) {
  ok(new RegExp(`const CHAMBERS = \\[[^\\]]*"${c}"`).test(fn),
    `the Function no longer accepts the pre-existing chamber "${c}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9 · Wave-1 issue keys are real, and the blocked one stays blocked
// ─────────────────────────────────────────────────────────────────────────────
const WAVE1 = ["deportations", "lower_taxes", "energy_production", "end_dei", "voter_id"];
for (const k of WAVE1) ok(ISSUE_KEYS.has(k), `wave-1 issue key "${k}" is not in db/issue-keys.json`);

const receipts = readFileSync(join(ROOT, "receipt-cards.js"), "utf8");
const blockedBlock = (receipts.match(/BLOCKED_ISSUE_KEYS\s*=\s*\{[\s\S]*?\}/) || [""])[0];
ok(/tariffs_authority/.test(blockedBlock),
  "tariffs_authority is no longer in BLOCKED_ISSUE_KEYS — the EER wave-1 exclusion rests on it");
for (const k of WAVE1) {
  ok(!new RegExp(`\\b${k}\\b`).test(blockedBlock),
    `wave-1 issue key "${k}" is in BLOCKED_ISSUE_KEYS and cannot ship`);
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ exec vocabulary: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — ✒️ EER vocabulary, source rule, guards and schema`);
