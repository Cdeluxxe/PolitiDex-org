#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues-drawer.mjs — related-issue pairs inside the issue drawer
// ─────────────────────────────────────────────────────────────────────────────
// The issue drawer prints, after the finding line and before the vote table,
// the complete related-issue pairs that include the issue it is open on — the
// same lines as the person-file section, filtered to that issue.
//
//   1. SHOWN: Protect Public Lands on a file with a complete lands/energy pair
//      prints that pair, between the finding line and the tally.
//   2. OMITTED: an issue with no complete pair prints no block.
//   3. FILTERED: a complete pair that does not include the open issue is not in
//      that drawer (and is in the drawer of an issue it does include).
//   4. PERSON FILE: sectionHtml still prints every complete pair.
//   6. DOORS: every issue name in the person-file section, and every name but
//      the open issue in a drawer, is a link on the shared drawer route
//      (data-pdxc-gap + data-pdxc-gap-pid, same person) that the document click
//      handler turns into that issue's drawer; the open issue is plain text.
//   5. NOTHING ELSE MOVED: on the real corpus, every sampled drawer with the
//      block removed is byte-identical to the drawer rendered with no module,
//      and issue rows / scores are identical. Wiring and the shell bump.
//
//   node scripts/test-related-issues-drawer.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n      got:  ${JSON.stringify(a)}\n      want: ${JSON.stringify(b)}`);

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const corpus = buildCorpus(ROOT);

// withModule: load related-issues.js. extra: { pid: { key: stance } } layered
// over the real stance map for fixture files.
function boot(withModule, extra) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = withModule ? FILES.concat(["related-issues.js"]) : FILES;
  for (const f of files) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  if (extra) {
    const real = win._polPositionMap;
    win._polPositionMap = function (pid, p) {
      const base = real.apply(this, arguments) || {};
      if (!extra[pid]) return base;
      const out = Object.assign({}, base);
      for (const [k, s] of Object.entries(extra[pid])) out[k] = { stance: s, text: "fixture" };
      return out;
    };
  }
  return win;
}
const text = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-pair"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));

const PID = "lee";
const FIX = {
  [PID]: {
    lands_preserve: "support", energy_production: "oppose",   // lands / energy, complete
    gov_regulation: "support",                                 // red tape / lands, complete
    lands_energy: "mixed",                                     // lands / resource dev, incomplete
    gun_rights: "support", gun_safety: "oppose",               // a pair without lands_preserve
    water: "mixed",                                            // water pairs incomplete
  },
};

// ── 1–4 · fixture file ─────────────────────────────────────────────────────
{
  const win = boot(true, FIX);
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  ok(RI && typeof RI.drawerHtml === "function", "PDXRelatedIssues.drawerHtml is published");

  // 1. shown, in place
  const h = CS.gapViewHtml(PID, "lands_preserve") || "";
  const b = block(h);
  ok(!!b, "Protect Public Lands drawer: no related-issues block");
  ok(text(b).startsWith("Related issues"), "the block is headed Related issues");
  const ln = lines(h);
  ok(ln.includes("Protect Public Lands: supports · Expand Domestic Energy Production: opposes"),
     `lands/energy pair missing: ${JSON.stringify(ln)}`);
  ok(ln.includes("Protect Public Lands: supports · Cut Federal Red Tape: supports"),
     `lands/red-tape pair missing: ${JSON.stringify(ln)}`);
  const at = h.indexOf('class="pdxri pdxri-drawer"');
  const find = h.indexOf('class="pdxlg-find"');
  const tally = h.indexOf('data-pdxlg-tally="1"');
  const table = h.indexOf('<table class="pdxlg-t">');
  ok(find >= 0 && at > find, "the block is not after the finding line");
  ok(tally < 0 || at < tally, "the block is not before the tally");
  ok(table < 0 || at < table, "the block is not before the vote table");
  eq((h.match(/class="pdxri pdxri-drawer"/g) || []).length, 1, "exactly one block in the drawer");

  // 3. filtered
  ok(!ln.some((l) => /Gun/.test(l)), "a pair without the open issue appears in the drawer");
  ok(!ln.some((l) => /Energy & Resource Development|Water Conservation/.test(l)), "an incomplete pair appears in the drawer");
  for (const l of ln) ok(/Protect Public Lands: /.test(l), `a drawer line does not include the open issue: ${l}`);
  const hg = CS.gapViewHtml(PID, "gun_rights") || "";
  const lg = lines(hg);
  ok(lg.includes("Protect Gun Rights: supports · Stronger Gun Safety Laws: opposes"), "the gun pair is missing from its own drawer");
  ok(!lg.some((l) => /Public Lands/.test(l)), "the lands pairs leak into the gun drawer");

  // 2. omitted
  for (const key of ["water", "lands_energy", "healthcare", "voter_id"]) {
    const hx = CS.gapViewHtml(PID, key) || "";
    ok(!/pdxri-drawer|Related issues/.test(hx), `${key}: a related-issues block prints with no complete pair`);
  }

  // 4. person-file section still prints every complete pair
  const sec = RI.sectionHtml(PID, win.CMP_DATA[PID]);
  const sl = [...sec.matchAll(/<li class="pdxri-pair"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
  const all = RI.pairsFor(PID, win.CMP_DATA[PID]).map(RI.lineText);
  eq(JSON.stringify(sl), JSON.stringify(all), "the person-file section prints every complete pair");
  ok(sl.includes("Protect Gun Rights: supports · Stronger Gun Safety Laws: opposes"), "section lost a pair outside the drawer's issue");
  ok(sl.includes("Protect Public Lands: supports · Expand Domestic Energy Production: opposes"), "section lost the lands/energy pair");
  eq(RI.PAIRS.length, 54, "the list is still fifty-four pairs");

  // 6. doors
  const doors = (html) => [...html.matchAll(/<a class="pdxri-go" href="([^"]*)" data-pdxri-go="([^"]*)" data-pdxc-gap="([^"]*)" data-pdxc-gap-pid="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
    .map((m) => ({ href: m[1], go: m[2], key: m[3], pid: m[4], label: m[5].replace(/&amp;/g, "&") }));
  const labelOf = Object.fromEntries(RI.PAIRS.flatMap((pr) => [[pr.a.key, pr.a.label], [pr.b.key, pr.b.label]]));
  const secDoors = doors(sec);
  const secPairs = RI.pairsFor(PID, win.CMP_DATA[PID]);
  eq(secDoors.length, secPairs.length * 2, "person file: not every issue name in every pair is a link");
  eq(JSON.stringify(secDoors.map((d) => d.key)), JSON.stringify(secPairs.flatMap((r) => [r.a.key, r.b.key])),
     "person file: the links are not the pair's two issues, in order");
  for (const d of secDoors) {
    eq(d.pid, PID, `person file: ${d.key} link opens another person`);
    eq(d.go, d.key, `person file: ${d.key} link has mismatched keys`);
    eq(d.label, labelOf[d.key], `person file: ${d.key} link text is not the issue name`);
    ok(d.href.includes(encodeURIComponent(PID)) && d.href.includes(encodeURIComponent(d.key)), `person file: ${d.key} fallback href is not this person on this issue`);
    ok(/pdxgap-h|pdxlg|pdxgap/.test(CS.gapViewHtml(PID, d.key) || ""), `person file: ${d.key} link has no drawer to open`);
  }
  const drDoors = doors(b);
  eq(drDoors.length, ln.length, "drawer: not exactly one link per line (the other issue)");
  ok(!drDoors.some((d) => d.key === "lands_preserve"), "drawer: the open issue is a link");
  ok(/<span class="pdxri-issue">Protect Public Lands:<\/span>/.test(b), "drawer: the open issue is not plain text");
  for (const d of drDoors) eq(d.pid, PID, `drawer: ${d.key} link opens another person`);
  eq(JSON.stringify(drDoors.map((d) => d.key).sort()), JSON.stringify(["energy_production", "gov_regulation"]),
     "drawer: links are not the related issues");
  // Following a link from the drawer lands on a drawer whose own block lists the
  // same pair, with the issue just left now a link back.
  const back = CS.gapViewHtml(PID, "energy_production") || "";
  ok(lines(back).includes("Protect Public Lands: supports · Expand Domestic Energy Production: opposes"), "drawer: the linked drawer lost the pair");
  ok(doors(back).some((d) => d.key === "lands_preserve"), "drawer: the linked drawer has no link back");
  ok(!doors(back).some((d) => d.key === "energy_production"), "drawer: the linked drawer links to itself");
  // The route the links use is the one the document click handler opens.
  const cs = R("consistency.js");
  ok(/closest\('\[data-pdxc-gap\]'\)[\s\S]{0,400}openGap\(gap\.getAttribute\('data-pdxc-gap-pid'\)[^)]*\)?[^,]*,\s*gap\.getAttribute\('data-pdxc-gap'\)/.test(cs),
     "the shared click route no longer opens openGap(pid, key) from data-pdxc-gap");

  // no verdict
  ok(!/%|score|grade|contradict|badge/i.test(text(b)), "the drawer block carries a verdict word");
}

// ── 5 · nothing else moved on the real corpus ───────────────────────────────
{
  const off = boot(false), on = boot(true);
  const pids = ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis", "john_boyd"];
  let sheets = 0, withBlock = 0;
  for (const pid of pids) {
    let rows0 = [], rows1 = [];
    try { rows0 = off.PDXConsistency.issueRows(pid) || []; rows1 = on.PDXConsistency.issueRows(pid) || []; } catch { /* none */ }
    eq(JSON.stringify(rows1), JSON.stringify(rows0), `${pid}: issue rows / scores moved`);
    for (const r of rows0) {
      const a = off.PDXConsistency.gapViewHtml(pid, r.key) || "";
      const b = on.PDXConsistency.gapViewHtml(pid, r.key) || "";
      sheets++;
      const bl = block(b);
      if (bl) {
        withBlock++;
        const want = on.PDXRelatedIssues.pairsForIssue(pid, on.CMP_DATA[pid], r.key).map(on.PDXRelatedIssues.lineText);
        eq(JSON.stringify(lines(b)), JSON.stringify(want), `${pid} × ${r.key}: drawer lines are not this issue's complete pairs`);
      } else {
        eq(on.PDXRelatedIssues.pairsForIssue(pid, on.CMP_DATA[pid], r.key).length, 0, `${pid} × ${r.key}: complete pair but no block`);
      }
      ok(b.replace(bl, "") === a, `${pid} × ${r.key}: the drawer changed beyond the related-issues block`);
    }
  }
  ok(sheets > 20, `only ${sheets} drawers sampled`);
  console.log(`   real corpus: ${sheets} drawers compared · ${withBlock} carry a related-issues block`);
}

// ── wiring ──────────────────────────────────────────────────────────────────
{
  const cs = R("consistency.js");
  ok(/typeof RI\.drawerHtml !== 'function'/.test(cs), "the drawer call is guarded");
  for (const page of ["index.html", "person.html", "ballot.html", "issue.html"]) {
    ok(R(page).includes('<script defer src="/related-issues.js"></script>'), `${page} loads related-issues.js`);
  }
  const sw = R("sw.js");
  ok(sw.includes("'/related-issues.js',") && sw.includes("'/consistency.js',"), "drawer scripts are precached");
  const v = Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v >= 502, "shell version bumped for the drawer block");
}

if (failures.length) {
  console.error(`\n✗ related-issues-drawer: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues-drawer: all ${passed} assertions passed`);
