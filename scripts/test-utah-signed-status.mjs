#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-utah-signed-status.mjs — five Utah bills the Governor signed read Enacted
// on the bill page AND in the roll-call panel
// ─────────────────────────────────────────────────────────────────────────────
// 2023GS S.B. 16 and S.B. 288, and 2024GS H.B. 153, H.B. 182 and H.B. 529 were
// stored as 'failed'. le.utah.gov's action history for each ends "Governor
// Signed". The bill page already derived "Enacted" from the record; the panel
// prints vr_measures.status, which 20261120000000 corrects.
//
// What must stay true:
//
//   1. THE MIGRATION IS STATUS ONLY. Exactly five statements, each
//      `UPDATE vr_measures SET status = 'enacted'` on one row named by chamber,
//      number and session, guarded on status = 'failed'. No other column, no
//      other table, no INSERT or DELETE.
//   2. REPLAYED, IT MOVES THOSE FIVE AND NO OTHER. The applied migrations are
//      replayed (vr-measure-addresses.mjs's own parser, reading status too):
//      before this file the five read 'failed'; after it, 'enacted'; every other
//      row's stored status is byte-identical.
//   3. BOTH SURFACES SAY ENACTED. The bill page's status is "Enacted — signed
//      into law" with a "Signed by the Governor" row; the stored status now
//      equals the bill page's for all five, and the panel's label for it is
//      "Enacted". The API serves the panel vr_measures.status.
//   4. NOTHING ELSE MOVED. db/bill-docs.json and person-bills.json are current
//      and identical to the committed copies; consistency.js (effect lines) is
//      untouched.
//   5. MUTATIONS ARE CAUGHT: a mapping, a vote or an effect line added; one of
//      the five left failed; a second column set; a WHERE widened.
//
//   node scripts/test-utah-signed-status.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, symlinkSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ utah signed status: STALE HARNESS — ${m}`); process.exit(2); };

const MIG_NAME = "20261120000000_vr_utah_signed_bills_status_enacted.sql";
const MIG_DIR = join(ROOT, "netlify/database/migrations");
const MIG = R(`netlify/database/migrations/${MIG_NAME}`);
const FIVE = [
  { s: "2023GS", n: "S.B. 16", c: "utah senate" },
  { s: "2023GS", n: "S.B. 288", c: "utah senate" },
  { s: "2024GS", n: "H.B. 153", c: "utah house" },
  { s: "2024GS", n: "H.B. 182", c: "utah house" },
  { s: "2024GS", n: "H.B. 529", c: "utah house" },
];
const key = (x) => `${x.s}|${x.n}`;
const FIVE_KEYS = new Set(FIVE.map(key));

// ── 1 · the migration's shape ───────────────────────────────────────────────
const STMT = /^UPDATE vr_measures SET status = 'enacted'\s+WHERE chamber = '(utah house|utah senate)' AND number = '([^']+)'\s+AND external_ids->>'utahSession' = '(\d{4}GS)' AND status = 'failed'$/;
function parseMigration(src) {
  const code = String(src).replace(/^\s*--.*$/gm, "").trim();
  const stmts = code.split(";").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
  const bad = [];
  const updates = [];
  for (const st of stmts) {
    const m = STMT.exec(st.replace(/ WHERE /, " WHERE ").replace(/ AND external_ids/, " AND external_ids"));
    if (!m) { bad.push(`not a status-only update of one row: ${st.slice(0, 120)}`); continue; }
    updates.push({ c: m[1], n: m[2], s: m[3] });
  }
  if (/\b(INSERT|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/i.test(code)) bad.push("the migration inserts, deletes or alters");
  if (/\b(vr_measure_issues|vr_rollcalls|vr_member_votes|vr_positions|vr_measure_actions|vr_measure_provisions)\b/i.test(code))
    bad.push("the migration touches a table other than vr_measures");
  if (/\b(weight|support_meaning|is_primary|title|summary|number\s*=\s*'[^']*'\s*,|issue_key|rationale)\s*=/i.test(code.replace(/WHERE[\s\S]*?(?=UPDATE|$)/g, "")))
    bad.push("the migration sets a column other than status");
  const got = new Set(updates.map((u) => `${u.s}|${u.n}`));
  for (const f of FIVE) {
    const u = updates.find((x) => x.s === f.s && x.n === f.n);
    if (!u) bad.push(`${key(f)} is not set to enacted`);
    else if (u.c !== f.c) bad.push(`${key(f)} is updated in the wrong chamber`);
  }
  if (updates.length !== 5 || [...got].some((k) => !FIVE_KEYS.has(k))) bad.push(`the migration updates ${updates.length} rows, not the five`);
  return { bad, updates };
}

// ── 2 · replay stored status through the projection's own parser ────────────
// vr-measure-addresses.mjs reads every INSERT INTO vr_measures but drops
// `status`; a copy that keeps it is the same parser, plus one column.
const scratch = mkdtempSync(join(tmpdir(), "utah-status-"));
const PROJ = R("scripts/vr-measure-addresses.mjs");
const KEEP = `measureType: literal(col(t, "measure_type")) || "",`;
must(PROJ.includes(KEEP), "vr-measure-addresses.mjs still reads measure_type the way this harness extends");
mkdirSync(join(scratch, "scripts"));
writeFileSync(join(scratch, "scripts", "proj.mjs"), PROJ.replace(KEEP, `${KEEP} status: literal(col(t, "status")) || "",`));
const { measureAddresses } = await import(join(scratch, "scripts", "proj.mjs"));
function storedStatus(includeNew) {
  const root = mkdtempSync(join(tmpdir(), "utah-status-root-"));
  mkdirSync(join(root, "netlify/database/migrations"), { recursive: true });
  for (const f of readdirSync(MIG_DIR).filter((x) => x.endsWith(".sql") && x < MIG_NAME)) {
    symlinkSync(join(MIG_DIR, f), join(root, "netlify/database/migrations", f));
  }
  const out = {};
  for (const a of measureAddresses(root).published) out[`${a.sitting}|${a.number}`] = { status: a.status, chamber: a.chamber };
  if (includeNew) {
    for (const u of parseMigration(includeNew).updates) {
      const k = `${u.s}|${u.n}`;
      if (out[k] && out[k].chamber === u.c && out[k].status === "failed") out[k] = { ...out[k], status: "enacted" };
    }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the migration is status only");
// ═════════════════════════════════════════════════════════════════════════════
const shape = parseMigration(MIG);
eq(shape.bad.length, 0, `the migration sets five statuses and nothing else${shape.bad.length ? ": " + shape.bad.join("; ") : ""}`);
eq(readdirSync(MIG_DIR).filter((f) => f > MIG_NAME).length, 0, "no migration sorts after this one");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · replayed, it moves those five and no other");
// ═════════════════════════════════════════════════════════════════════════════
const before = storedStatus(null);
const after = storedStatus(MIG);
for (const f of FIVE) {
  eq(before[key(f)] && before[key(f)].status, "failed", `${key(f)} was stored failed`);
  eq(after[key(f)] && after[key(f)].status, "enacted", `${key(f)} is stored enacted`);
}
const moved = Object.keys(after).filter((k) => !FIVE_KEYS.has(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k]));
eq(moved.length, 0, `no other bill's stored status moved${moved.length ? ": " + moved.slice(0, 5).join(", ") : ""}`);
console.log(`      ${Object.keys(after).length} rows replayed`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · both surfaces say Enacted");
// ═════════════════════════════════════════════════════════════════════════════
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const BD = R("bill-detail.js");
const statusMap = (() => { const m = /var STATUS = (\{[\s\S]*?\});/.exec(BD); must(m, "bill-detail.js keeps its STATUS table"); return Function(`return ${m[1]}`)(); })();
must(/status:\s*vrMeasures\.status/.test(R("netlify/functions/voting-record.mts")), "the voting-record API serves vr_measures.status to the panel");
must(/bd-status bd-s-' \+ esc\(m\.status\)/.test(BD), "the panel prints the measure's stored status");
for (const f of FIVE) {
  const d = DOCS[key(f)];
  eq(d && d.st, "enacted", `${key(f)}'s bill page status is enacted`);
  ok(d && /^Enacted — /.test(d.sl), `${key(f)}'s bill page reads Enacted`);
  ok(d && d.h.some((h) => h.a === "Signed by the Governor"), `${key(f)}'s history carries the Governor's signature`);
  eq(after[key(f)].status, d && d.st, `${key(f)}: the panel's stored status is the bill page's`);
  eq(statusMap[after[key(f)].status], "Enacted", `${key(f)}: the panel labels it Enacted`);
  ok(statusMap[after[key(f)].status] !== "Failed", `${key(f)} still reads failed in the panel`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
let fresh = true;
try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "ignore" }); } catch (e) { fresh = false; }
ok(fresh, "db/bill-docs.json and person-bills.json are current");
const gitShow = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { return null; } };
for (const f of ["db/bill-docs.json", "person-bills.json", "consistency.js"]) {
  const head = gitShow(f);
  if (head === null) { console.log(`      (no git baseline for ${f})`); continue; }
  ok(head === R(f), `${f} changed`);
}
// An effect line is keyed '<number>|<sitting>|<issue>' in consistency.js; count
// every such key for the five.
const effectFor = (src) => FIVE.flatMap((f) => String(src).split(`'${f.n}|${f.s}|`).length - 1 + String(src).split(`"${f.n}|${f.s}|`).length - 1);
const effectCount = (src) => effectFor(src).reduce((a, b) => a + b, 0);
const headCons = gitShow("consistency.js");
if (headCons !== null) eq(effectCount(R("consistency.js")), effectCount(headCons), "no effect line was added for the five");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
const caught = (name, bad) => { ok(bad, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad ? "caught" : "MISSED"}`); };
caught("a mapping added", parseMigration(MIG + "\nINSERT INTO vr_measure_issues (measure_id, issue_key) VALUES (1, 'lgbtq_rights');").bad.length > 0);
caught("a member vote added", parseMigration(MIG + "\nINSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES (1, 'cox', 'yea');").bad.length > 0);
caught("an effect line added", parseMigration(MIG + "\nUPDATE vr_measure_issues SET rationale = 'Bans a treatment.' WHERE measure_id = 1;").bad.length > 0);
caught("an effect line added to consistency.js", effectCount(R("consistency.js") + "\n'S.B. 16|2023GS|lgbtq_rights': 'Bans a treatment.',") !== effectCount(headCons || R("consistency.js")));
{
  const dropped = MIG.replace(/UPDATE vr_measures SET status = 'enacted'\s+WHERE chamber = 'utah house' AND number = 'H\.B\. 529'[\s\S]*?;/, "");
  must(dropped !== MIG, "the H.B. 529 statement is where this mutation looks for it");
  const st = storedStatus(dropped)[key(FIVE[4])].status;
  caught("H.B. 529 left failed", parseMigration(dropped).bad.length > 0 && st === "failed");
}
caught("a second column set", parseMigration(MIG.replace("SET status = 'enacted'\n WHERE chamber = 'utah senate' AND number = 'S.B. 16'", "SET status = 'enacted', title = 'X'\n WHERE chamber = 'utah senate' AND number = 'S.B. 16'")).bad.length > 0);
caught("a WHERE widened to every failed Utah row", parseMigration(MIG + "\nUPDATE vr_measures SET status = 'enacted' WHERE status = 'failed';").bad.length > 0);
caught("a different bill set enacted", parseMigration(MIG.replace("'H.B. 182'", "'H.B. 183'")).bad.length > 0);

if (failures.length) {
  console.error(`\n✗ utah signed status: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures.slice(0, 30)) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ utah signed status: five signed bills read Enacted on the page and in the panel, nothing else moved — ${passed} assertions passed`);
