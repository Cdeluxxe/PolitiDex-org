#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues-drawer.mjs — the related-issues map inside the drawer
// ─────────────────────────────────────────────────────────────────────────────
// The issue drawer prints, after the finding line and before the vote table,
// every issue the map relates to the open issue, with up to two lines each:
// a stated line ("Label: supports|opposes", from the stance map) and a record
// line ("Label: record runs with|against", from the record-direction index).
//
//   1. LEE × PROTECT PUBLIC LANDS (real data): the drawer leads with votes and
//      shows Keep Public Lands Public with Lee's stated position from the
//      stance map, as a link that opens that drawer on Lee; the block sits
//      between the finding line and the tally.
//   1b. LEE × KEEP PUBLIC LANDS PUBLIC (real data): Protect Public Lands shows
//      "record runs against"; a stated-only related issue shows only its
//      stated line; a record-only one only its record line.
//   1c. VOTES ONLY + COLOURS: Lee's Keep Public Lands Public drawer lists
//      Protect Public Lands (no stated position) beside Expand Domestic Energy
//      Production and Local Land Control; a related issue with votes that run
//      no direction prints its bare name, still a link; every name carries its
//      issue's chip colour token.
//   2. FIXTURE: every related issue with a published direction is listed, in
//      map order; a mixed one, an unrelated one and the open issue are not; the
//      open issue is never a link; following a link lands on a drawer that
//      links back.
//   3. OMITTED: an issue with no related positions prints no block.
//   4. NOTHING ELSE MOVED: on the real corpus, every sampled drawer with the
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
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
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
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
const doors = (html) => [...html.matchAll(/<a class="pdxri-go" href="([^"]*)" data-pdxri-go="([^"]*)" data-pdxc-gap="([^"]*)" data-pdxc-gap-pid="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
  .map((m) => ({ href: m[1], go: m[2], key: m[3], pid: m[4], label: m[5].replace(/&amp;/g, "&") }));
const WORD = { support: "supports", oppose: "opposes" };

// ── 1 · Lee × Protect Public Lands, real data ──────────────────────────────
{
  const win = boot(true);
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const kp = pm.lands_keep_public && pm.lands_keep_public.stance;
  ok(kp === "support" || kp === "oppose", "Lee has no published position on Keep Public Lands Public");
  const h = CS.gapViewHtml("lee", "lands_preserve") || "";
  const ln = lines(h);
  ok(ln.includes(`Keep Public Lands Public: ${WORD[kp]}`), `Lee's drawer lacks Keep Public Lands Public: ${WORD[kp]} — ${JSON.stringify(ln)}`);
  const d = doors(block(h)).find((x) => x.key === "lands_keep_public");
  ok(d && d.pid === "lee", "Keep Public Lands Public is not a link to Lee's drawer on that issue");
  ok(/pdxgap|pdxlg/.test(CS.gapViewHtml("lee", "lands_keep_public") || ""), "the linked drawer does not render");
  const find = h.indexOf('class="pdxlg-find"'), at = h.indexOf('class="pdxri pdxri-drawer"');
  const tally = h.indexOf('data-pdxlg-tally="1"'), table = h.indexOf('<table class="pdxlg-t">');
  ok(tally > 0 && table > 0, "Lee's Protect Public Lands drawer has no vote table");
  ok(find >= 0 && at > find, "the block is not after the finding line");
  ok(at < tally && at < table, "the block is not before the votes");
  for (const it of RI.itemsFor("lee", win.CMP_DATA.lee, "lands_preserve")) {
    ok(RI.MAP.lands_preserve.includes(it.key), `${it.key} is in the drawer but not in the map`);
  }
}

// ── 1b · Lee × Keep Public Lands Public, real data: stated and record lines ─
{
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  const ln = lines(h);
  ok(ln.includes("Protect Public Lands: record runs against"), `Lee's Keep Public Lands Public drawer lacks Protect Public Lands: record runs against — ${JSON.stringify(ln)}`);
  const stated = (k) => pm[k] && /^(support|oppose)$/.test(pm[k].stance) ? pm[k].stance : null;
  // Stated-only: a related issue with a stance and no one-way record.
  const so = RI.MAP.lands_keep_public.find((k) => stated(k) && !RI.recordOf("lee", k));
  ok(!!so, "no stated-only related issue on Lee's Keep Public Lands Public drawer");
  if (so) {
    const L = String(win.ISSUE_MAP[so].label).replace(/^[^A-Za-z0-9]+/, "").trim();
    const mine = ln.filter((l) => l.startsWith(L + ":"));
    eq(JSON.stringify(mine), JSON.stringify([`${L}: ${WORD[stated(so)]}`]), `${so}: a stated-only related issue shows only the stated line`);
  }
  // Record-only: Protect Public Lands has no published stance for Lee.
  ok(!stated("lands_preserve"), "Lee now has a stated position on Protect Public Lands; pick another record-only key");
  eq(JSON.stringify(ln.filter((l) => l.startsWith("Protect Public Lands:"))), JSON.stringify(["Protect Public Lands: record runs against"]),
     "a record-only related issue shows only the record line");
  const b = block(h);
  ok(/data-pdxri-line="record" data-pdxri-rec="against"[^>]*><span class="pdxri-issue"[^>]*><a class="pdxri-go"[^>]*data-pdxc-gap="lands_preserve"/.test(b),
     "the record line's issue name opens Protect Public Lands on Lee");
  ok(/<span class="pdxri-rec">record runs against<\/span>/.test(b), "the record word is not the neutral record style");
  ok(!/class="pdxri-dir[^"]*">record/.test(b), "a record word carries the stated position tint");
  ok(!ln.some((l) => /^Keep Public Lands Public:/.test(l)), "the open issue is repeated in its own drawer");
}

// ── 1c · votes-only lines and issue colours, real data ─────────────────────
{
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues, C = win.PDXIssueColors;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  const b = block(h), ln = lines(h);
  ok(!(pm.lands_preserve && /^(support|oppose)$/.test(pm.lands_preserve.stance)), "Lee has a stated position on Protect Public Lands");
  ok(ln.some((l) => l.startsWith("Protect Public Lands")), `Protect Public Lands missing from Lee's Keep Public Lands Public drawer — ${JSON.stringify(ln)}`);
  ok(ln.some((l) => l.startsWith("Expand Domestic Energy Production:")) && ln.some((l) => l.startsWith("Local Land Control:")),
     "Expand Domestic Energy Production / Local Land Control missing beside it");
  ok(doors(b).some((d) => d.key === "lands_preserve" && d.pid === "lee"), "Protect Public Lands is not a link on Lee");
  // A votes-only key with no direction: bare name, no word, still a link.
  const bare = RI.MAP.lands_keep_public.find((k) => !(pm[k] && /^(support|oppose)$/.test(pm[k].stance)) && !RI.recordOf("lee", k) && RI.hasVotes("lee", k));
  ok(!!bare, "no votes-only, no-direction related issue on Lee's drawer");
  if (bare) {
    const L = String(win.ISSUE_MAP[bare].label).replace(/^[^A-Za-z0-9]+/, "").trim();
    eq(JSON.stringify(ln.filter((l) => l.startsWith(L))), JSON.stringify([L]), `${bare}: a votes-only line is the bare name`);
    const li = (new RegExp(`<li class="pdxri-item" data-pdxri-key="${bare}" data-pdxri-line="votes">[\\s\\S]*?</li>`).exec(b) || [""])[0];
    ok(/class="pdxri-go"/.test(li) && !/pdxri-dir|pdxri-rec/.test(li), `${bare}: the votes-only line is not a bare link`);
  }
  // Colours: every name span carries its issue's chip token.
  const spans = [...b.matchAll(/<span class="pdxri-issue" data-pdxri-color="([^"]+)" style="([^"]*)">/g)];
  eq(spans.length, (b.match(/class="pdxri-issue"/g) || []).length, "an issue name has no colour token");
  for (const [, key, style] of spans) {
    eq(style, C.styleFor(key), `${key}: the name is not in its issue chip colour`);
    ok(style.includes(C.getIssueColor(key).ink), `${key}: the chip ink is missing`);
  }
  ok(/\.pdxri-drawer \.pdxri-issue\{[^}]*color:var\(--pdx-ic-ink/.test(R("consistency.js")), "the drawer name does not read --pdx-ic-ink");
  ok(/\.pdxri-drawer \.pdxri-go\{color:inherit;text-decoration:underline/.test(R("consistency.js")), "the drawer link lost its underline");
  ok(/\.pdxri-drawer \.pdxri-dir\.s-support\{color:#4ade80;\}/.test(R("consistency.js")) && /\.pdxri-drawer \.pdxri-dir\.s-oppose\{color:#f87171;\}/.test(R("consistency.js")),
     "the position words are no longer green / red");
  ok(/\.pdxri-issue \{[^}]*color: var\(--pdx-ic-ink/.test(R("person-file.css")), "the person-file name does not read --pdx-ic-ink");
}

// ── 2, 3 · fixture file ─────────────────────────────────────────────────────
const PID = "lee";
const FIX = {
  [PID]: {
    lands_preserve: "support", lands_keep_public: "support", energy_production: "oppose",
    gov_regulation: "support", lands_local: "mixed", lands_energy: "mixed",
    gun_rights: "support", gun_safety: "oppose",
  },
};
{
  const win = boot(true, FIX);
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  ok(RI && typeof RI.drawerHtml === "function", "PDXRelatedIssues.drawerHtml is published");
  const pm = win._polPositionMap(PID, win.CMP_DATA[PID]);
  const REC = { with: "record runs with", against: "record runs against" };
  const want = (key) => RI.MAP[key].flatMap((k) => {
    const L = String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim(), out = [];
    if (pm[k] && /^(support|oppose)$/.test(pm[k].stance)) out.push(`${L}: ${WORD[pm[k].stance]}`);
    const r = RI.recordOf(PID, k);
    if (r) out.push(`${L}: ${REC[r]}`);
    if (!out.length && RI.hasVotes(PID, k)) out.push(L);
    return out;
  });

  const h = CS.gapViewHtml(PID, "lands_preserve") || "";
  const b = block(h);
  ok(!!b && text(b).startsWith("Related issues"), "Protect Public Lands drawer: no Related issues block");
  const ln = lines(h);
  eq(JSON.stringify(ln), JSON.stringify(want("lands_preserve")), "drawer lists every related published position, in map order");
  for (const l of ["Keep Public Lands Public: supports", "Expand Domestic Energy Production: opposes", "Cut Federal Red Tape: supports"]) {
    ok(ln.includes(l), `drawer lacks ${l}`);
  }
  ok(!ln.some((l) => /^(Local Land Control|Energy & Resource Development): (supports|opposes)/.test(l)), "a mixed related position is printed");
  ok(!ln.some((l) => /Gun/.test(l)), "an unrelated issue is printed");
  ok(!ln.some((l) => /^Protect Public Lands:/.test(l)), "the open issue is listed");
  ok(!doors(b).some((x) => x.key === "lands_preserve"), "the open issue is a link");
  eq(doors(b).length, ln.length, "not every related line is a link");
  for (const x of doors(b)) eq(x.pid, PID, `${x.key} link opens another person`);
  eq((h.match(/class="pdxri pdxri-drawer"/g) || []).length, 1, "exactly one block in the drawer");
  ok(!/%|score|grade|contradict|badge/i.test(text(b)), "the drawer block carries a verdict word");

  const back = CS.gapViewHtml(PID, "lands_keep_public") || "";
  ok(lines(back).includes("Protect Public Lands: supports"), "the linked drawer lacks the issue just left");
  ok(doors(block(back)).some((x) => x.key === "lands_preserve"), "the linked drawer has no link back");
  ok(!doors(block(back)).some((x) => x.key === "lands_keep_public"), "the linked drawer links to itself");

  const hg = lines(CS.gapViewHtml(PID, "gun_rights") || "");
  ok(hg.includes("Stronger Gun Safety Laws: opposes") && !hg.some((l) => /Lands/.test(l)), "the gun drawer lists the wrong issues");

  for (const key of ["voter_id", "pro_life", "healthcare"]) {
    const hx = CS.gapViewHtml(PID, key) || "";
    if (want(key).length) continue;
    ok(!/pdxri-drawer|Related issues/.test(hx), `${key}: a related-issues block prints with no related position`);
  }
  let omitted = 0;
  for (const key of Object.keys(RI.MAP)) {
    if (want(key).length) continue;
    omitted++;
    eq(RI.drawerHtml(PID, win.CMP_DATA[PID], key), "", `${key}: drawerHtml is not empty with no related position`);
  }
  ok(omitted > 0, "no issue without related positions was checked");

  const cs = R("consistency.js");
  ok(/closest\('\[data-pdxc-gap\]'\)[\s\S]{0,400}openGap\(gap\.getAttribute\('data-pdxc-gap-pid'\)[^,]*,\s*gap\.getAttribute\('data-pdxc-gap'\)/.test(cs),
     "the shared click route no longer opens openGap(pid, key) from data-pdxc-gap");
}

// ── 4 · nothing else moved on the real corpus ───────────────────────────────
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
        const want = on.PDXRelatedIssues.itemsFor(pid, on.CMP_DATA[pid], r.key).flatMap(on.PDXRelatedIssues.lineTexts);
        eq(JSON.stringify(lines(b)), JSON.stringify(want), `${pid} × ${r.key}: drawer lines are not this issue's related positions`);
      } else {
        eq(on.PDXRelatedIssues.itemsFor(pid, on.CMP_DATA[pid], r.key).length, 0, `${pid} × ${r.key}: related position but no block`);
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
  ok(v >= 506, "shell version bumped for issue colours and votes-only lines");
}

if (failures.length) {
  console.error(`\n✗ related-issues-drawer: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues-drawer: all ${passed} assertions passed`);
