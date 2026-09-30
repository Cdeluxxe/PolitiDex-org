#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-trump-iran-instruments.mjs — the second term's Iran instruments, on the
// keys that already exist
// ─────────────────────────────────────────────────────────────────────────────
// Exec wave 13 files three dated, officially published instruments:
//   NSPM-2 (2025-02-04), GovInfo DCPD-202500223          → iran_policy
//   Letter of 2025-06-23, GovInfo DCPD-202500715          → war_powers + iran_policy
//   Executive Order 14382 (2026-02-06), 91 FR 6493        → iran_policy
// No War Powers letter for February 28, 2026 or June 26-28, 2026 and no
// ceasefire, termination or stand-down letter was found in an official source, so
// none is filed and Diplomacy & Restraint gains nothing. The fence:
//
//   1. THE IRAN DRAWER IS EXACTLY S.J. Res. 68 PLUS THE THREE. No Yemen
//      resolution, no Qatar order, no cartel proclamation.
//   2. RESTRAINT IS UNCHANGED. Only a filed ceasefire letter could add to it.
//   3. WAR POWERS TAKES THE FORCE NOTICE ONLY.
//   4. EVERY NEW ROW IS AN OFFICIAL DOOR OR PLAIN TEXT, never WhiteHouse.gov.
//   5. EVERY NEW PAIR HAS ITS LINE: 140 characters or fewer, the act as subject.
//   6. NO SIDE ON IRAN: the ledger prints no for/against line.
//   7. MUTATION. Mapping EO 14353 (Qatar) to iran_policy fails the checker.
//
//   node scripts/test-trump-iran-instruments.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "stance-tree.js",
];
const IR = "iran_policy", WP = "war_powers", RS = "restraint";
const MIG = "netlify/database/migrations/20261107000000_seed_exec_actions_wave13.sql";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ trump iran instruments: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

function boot(patch) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}
const text = (h) => String(h).replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ");

const SJ7 = "S.J. Res. 7 (116th Congress)", SJ68 = "S.J. Res. 68 (116th Congress)";
const QATAR = "Executive Order 14353", CARTELS = "Proclamation 11015";
const NSPM2 = "NSPM-2", EO14382 = "Executive Order 14382", LETTER = "Presidential Letter, DCPD-202500715";
const ADDED = [NSPM2, EO14382, LETTER];
const WANT_IRAN = [SJ68, ...ADDED].sort();
const WANT_RESTRAINT = [SJ7, SJ68, QATAR, CARTELS].sort();
const WANT_WAR = [SJ7, SJ68, QATAR, CARTELS, LETTER].sort();

const drawer = (win, k) => ((win.PDXConsistency.dossierItems("trump", k) || []).map((d) => d.ident)).sort();

// The drawer contract, as one checker, so the mutation below runs the same code.
function drawerFaults(win) {
  const f = [];
  const ir = drawer(win, IR), rs = drawer(win, RS), wp = drawer(win, WP);
  if (JSON.stringify(ir) !== JSON.stringify(WANT_IRAN)) f.push(`Iran drawer is ${ir.join(" | ")}`);
  for (const bad of [SJ7, QATAR, CARTELS]) if (ir.includes(bad)) f.push(`${bad} is in the Iran drawer`);
  if (JSON.stringify(rs) !== JSON.stringify(WANT_RESTRAINT)) f.push(`Restraint drawer is ${rs.join(" | ")}`);
  if (JSON.stringify(wp) !== JSON.stringify(WANT_WAR)) f.push(`War Powers drawer is ${wp.join(" | ")}`);
  return f;
}
// The seed contract, likewise.
function seedFaults(trump) {
  const f = [];
  const onIran = trump.filter((a) => (a.issues || []).some((i) => i.issueKey === IR)).map((a) => a.documentId).sort();
  if (JSON.stringify(onIran) !== JSON.stringify(WANT_IRAN)) f.push(`iran_policy is on ${onIran.join(" | ")}`);
  for (const bad of [QATAR, CARTELS, SJ7]) {
    const a = trump.find((x) => x.documentId === bad);
    if (a && a.issues.some((i) => i.issueKey === IR)) f.push(`${bad} is mapped to iran_policy`);
  }
  return f;
}

const SEED = JSON.parse(R("db/exec-action-seed.json"));
const TRUMP = SEED.actions.trump;
const doc = (id) => TRUMP.find((a) => a.documentId === id);
const win = boot();
const CS = win.PDXConsistency;
must(!!CS && typeof CS.dossierItems === "function", "PDXConsistency.dossierItems is not published");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the Iran drawer is S.J. Res. 68 plus the three instruments");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(seedFaults(TRUMP).join("; "), "", "the seed's Iran mapping");
  eq(drawerFaults(win).join("; "), "", "the rendered drawers");
  for (const id of ADDED) must(!!doc(id), `${id} is not in the exec seed`);
  // The keys each one sits on, and nothing else.
  eq(doc(NSPM2).issues.map((i) => i.issueKey).join(","), IR, "NSPM-2 sits on iran_policy alone");
  eq(doc(EO14382).issues.map((i) => i.issueKey).join(","), IR, "EO 14382 sits on iran_policy alone");
  eq(doc(LETTER).issues.map((i) => i.issueKey).sort().join(","), [IR, WP].sort().join(","), "the letter sits on war_powers and iran_policy");
  eq(doc(LETTER).issues.find((i) => i.isPrimary).issueKey, WP, "the use-of-force notice is primary on war_powers");
  for (const id of ADDED) {
    const a = doc(id);
    eq(a.term, "47", `${id}: term 47`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(a.actedAt), `${id}: dated`);
    ok(!a.issues.some((i) => i.issueKey === RS), `${id}: nothing added on restraint`);
  }
  eq(doc(NSPM2).actedAt, "2025-02-04", "NSPM-2 is dated February 4, 2025");
  eq(doc(EO14382).actedAt, "2026-02-06", "EO 14382 is dated February 6, 2026");
  eq(doc(LETTER).actedAt, "2025-06-23", "the letter is dated June 23, 2025");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Diplomacy & Restraint gains nothing — no ceasefire letter is filed");
// ═════════════════════════════════════════════════════════════════════════════
{
  const onRestraint = TRUMP.filter((a) => (a.issues || []).some((i) => i.issueKey === RS)).map((a) => a.documentId).sort();
  eq(JSON.stringify(onRestraint), JSON.stringify(WANT_RESTRAINT), "restraint carries the same four documents");
  ok(!TRUMP.some((a) => /cease-?fire|termination of hostilities|stand-?down/i.test(`${a.title} ${a.documentId}`)),
    "no ceasefire or termination letter is on file to add");
  const mig = R(MIG).replace(/^\s*--.*$/gm, "");
  ok(!/'restraint'/.test(mig), "wave 13 inserts nothing on restraint");
  ok(!/'yemen_policy'|'america_first_fp'/.test(mig), "wave 13 inserts nothing on Yemen or America First");
  ok(!/Executive Order 14353|Proclamation 11015/.test(mig), "wave 13 does not touch the Qatar order or the cartel proclamation");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · each new row is an official door or plain text");
// ═════════════════════════════════════════════════════════════════════════════
{
  const OFFICIAL = /^https:\/\/(?:www\.)?(?:federalregister\.gov\/documents\/|govinfo\.gov\/)/;
  const html = {};
  for (const k of [IR, WP]) html[k] = CS.gapViewHtml("trump", k) || "";
  must(html[IR].length > 1000, "trump × iran_policy rendered nothing");
  for (const id of ADDED) {
    const a = doc(id);
    ok(OFFICIAL.test(a.sourceUrl), `${id}: stores a Federal Register or GovInfo address (${a.sourceUrl})`);
    ok(!/https?:\/\/[^"\s]*whitehouse\.gov/i.test(JSON.stringify(a)), `${id}: carries no WhiteHouse.gov address`);
    for (const m of a.issues) {
      const h = html[m.issueKey];
      const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
      // Official door, or no anchor at all: a link to anything else is a fault.
      ok(hrefs.includes(a.sourceUrl), `${id} × ${m.issueKey}: the official door is not rendered`);
    }
  }
  for (const k of [IR, WP]) {
    ok(!/href="https?:\/\/(?:www\.)?whitehouse\.gov/.test(html[k]), `trump × ${k}: a WhiteHouse.gov link rendered`);
  }
  ok(!/whitehouse\.gov/i.test(R(MIG).replace(/^\s*--.*$/gm, "")), "wave 13 SQL carries no WhiteHouse.gov address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every new pair has its line");
// ═════════════════════════════════════════════════════════════════════════════
{
  const src = R("consistency.js"), at = src.indexOf("var _DOS_EXEC_EFFECT = {");
  must(at !== -1, "_DOS_EXEC_EFFECT is not in consistency.js");
  const EFFECT = vm.runInNewContext("(" + src.slice(at + "var _DOS_EXEC_EFFECT = ".length, src.indexOf("\n  };", at) + 4) + ")");
  for (const id of ADDED) {
    for (const m of doc(id).issues) {
      const k = `${id}|${m.issueKey}`, v = EFFECT[k];
      ok(!!v, `${k}: no effect line`);
      if (!v) continue;
      ok(v.length <= 140, `${k}: ${v.length} characters`);
      ok(/[.!?]$/.test(v), `${k}: does not end on a stop`);
      ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(v.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
      ok(/^[A-Z][a-z]+ed\b/.test(v), `${k}: does not open on what the act did`);
      ok(!/\b(mapped|mapping|coded|scor|rationale|weight|chip|archive|precedent|mirror)/i.test(v), `${k}: method words`);
      ok(/Iran/.test(v), `${k}: does not name Iran`);
    }
  }
  for (const bad of [QATAR, CARTELS, SJ7]) ok(!EFFECT[`${bad}|${IR}`], `${bad} carries an Iran line`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Iran has no side: no for/against line, the acts still counted");
// ═════════════════════════════════════════════════════════════════════════════
{
  const np = R("consistency.js").split("var _DOS_LEDGER_NO_SIDE = {")[1].split("};")[0];
  ok(/\biran_policy:\s*1/.test(np), "iran_policy is in _DOS_LEDGER_NO_SIDE");
  const t = text(CS.gapViewHtml("trump", IR) || "");
  ok(!/Acts: \d+ for · \d+ against/.test(t), "Iran's ledger prints no for/against line");
  ok(/On this issue: \d+ /.test(t), "Iran's tally line still counts the acts");
  ok(!/\b(supports|opposes) Iran\b/.test(t), "no pole is claimed on Iran");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · mutation: EO 14353 on iran_policy fails");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Seed level.
  const mutated = JSON.parse(JSON.stringify(TRUMP));
  const q = mutated.find((a) => a.documentId === QATAR);
  must(!!q, "EO 14353 is not in the seed to mutate");
  q.issues.push({ issueKey: IR, direction: "advances", isPrimary: false, weight: 50, plain: "Mutation." });
  ok(seedFaults(mutated).length > 0, "the seed checker passes with EO 14353 mapped to iran_policy");
  // Render level: the same mapping, patched into the client data.
  const bad = boot({
    "exec-action-data.js": (s) => s + `
;(function () {
  var a = window.EXEC_ACTIONS.trump.find(function (x) { return x.documentId === ${JSON.stringify(QATAR)}; });
  a.issues.push({ issueKey: ${JSON.stringify(IR)}, direction: "advances", isPrimary: false, weight: 50, plain: "Mutation." });
})();`,
  });
  const f = drawerFaults(bad);
  ok(f.length > 0, "the drawer checker passes with EO 14353 in the Iran drawer");
  ok(f.some((x) => x.includes(`${QATAR} is in the Iran drawer`)), `the fault names the Qatar order (${f.join("; ")})`);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
