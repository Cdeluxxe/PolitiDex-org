#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues.mjs — the related-issues map, and the person-file section
// ─────────────────────────────────────────────────────────────────────────────
// related-issues.js holds one table, MAP: issue key → the keys that share its
// ground. It is the only place that decides what is related.
//
//   1. THE MAP: every key and every listed key is in the issue register, every
//      register key has an entry, no key lists itself or a key twice, and the
//      map is symmetric. Protect Public Lands and Keep Public Lands Public list
//      each other, and Protect Public Lands lists Keep Public Lands Public,
//      Expand Domestic Energy Production, Cut Federal Red Tape and Local Land
//      Control. No second list: the module carries no PAIRS table.
//   2. PERSON FILE: for each issue with a published direction, every related
//      issue with a published direction or votes, as one line with both parts:
//      "Label: supports|opposes|no stated position · record runs with|record
//      runs against|N for · N against|no record"; a related issue with no
//      position (or a mixed one) and no votes is left out; no group with no
//      related lines; no section with none at all.
//   3. DOORS: every issue name in the section is a link on the shared drawer
//      route (data-pdxc-gap + data-pdxc-gap-pid) for the same person.
//   4. NO VERDICT: no %, score, grade or "contradiction" in the markup.
//   5. REAL DATA: the real stance map is read, not written; every line reads
//      the published stance.
//   6. WIRING: the hook in profiles-full.js is a guarded call in the explore
//      stage; the module is on every page that loads it, precached, with a
//      bumped shell; it reads no scoring or effect engine.
//
//   node scripts/test-related-issues.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n      got:  ${JSON.stringify(a)}\n      want: ${JSON.stringify(b)}`);
const strip = (h) => h.replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function boot(posMaps) {
  const win = makeSandbox();
  win._polPositionMap = (pid) => posMaps[pid] || {};
  const ctx = vm.createContext(win);
  vm.runInContext(R("issue-map.js"), ctx, { filename: "issue-map.js" });
  vm.runInContext(R("issue-colors.js"), ctx, { filename: "issue-colors.js" });
  vm.runInContext(R("related-issues.js"), ctx, { filename: "related-issues.js" });
  return win;
}
const st = (s) => ({ stance: s, text: "fixture" });

const FIX = {
  lands: { lands_preserve: st("support"), lands_keep_public: st("support"), energy_production: st("oppose"),
           gov_regulation: st("mixed"), lands_local: st("oppose"), gun_rights: st("support") },
  oneSided: { lands_preserve: st("support"), gun_safety: st("mixed") },
  none: {},
  lonely: { gun_rights: st("support"), voter_id: st("oppose") },
};
const win = boot(FIX);
const RI = win.PDXRelatedIssues;
const IM = win.ISSUE_MAP;
const LBL = (k) => String(IM[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();

// 1. the map
{
  const M = RI.MAP;
  ok(M && typeof M === "object", "MAP is published");
  const reg = Object.keys(IM);
  for (const k of reg) ok(Array.isArray(M[k]) && M[k].length > 0, `register key ${k} has no related issues in the map`);
  for (const [k, list] of Object.entries(M)) {
    ok(k in IM, `map key ${k} is not in the issue register`);
    ok(!list.includes(k), `${k} lists itself`);
    eq(new Set(list).size, list.length, `${k} lists a key twice`);
    for (const r of list) {
      ok(r in IM, `${k} lists ${r}, which is not in the issue register`);
      ok(Array.isArray(M[r]) && M[r].includes(k), `map is not symmetric: ${k} lists ${r} but ${r} does not list ${k}`);
    }
  }
  for (const r of ["lands_keep_public", "energy_production", "gov_regulation", "lands_local"]) {
    ok(M.lands_preserve.includes(r), `Protect Public Lands does not list ${r}`);
  }
  ok(M.lands_keep_public.includes("lands_preserve"), "Keep Public Lands Public does not list Protect Public Lands");
  for (const r of ["energy_production", "gov_regulation", "lands_local"]) {
    ok(M.lands_keep_public.includes(r), `Keep Public Lands Public does not list ${r}`);
  }
  eq(JSON.stringify(RI.related("lands_preserve")), JSON.stringify(M.lands_preserve), "related() reads the map");
  eq(JSON.stringify(RI.related("no_such_key")), "[]", "an unknown key has no related issues");
  const code = R("related-issues.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/\bPAIRS\b/.test(code) && RI.PAIRS === undefined, "a second pairs list is still in the module");
}

// 2 + 3. person file
{
  const h = RI.sectionHtml("lands", {});
  const groups = [...h.matchAll(/<li class="pdxri-group" data-pdxri-issue="([^"]+)">([\s\S]*?)<\/ul><\/li>/g)];
  const byIssue = Object.fromEntries(groups.map((g) => [g[1], g[2]]));
  ok(h.includes('id="pdxsec-related-issues"') && strip(h).startsWith("Related issues"), "section is headed Related issues");
  const items = (html) => [...html.matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => strip(m[0]));
  const lp = byIssue.lands_preserve || "";
  ok(strip(lp).startsWith("Protect Public Lands: supports · no record"), "the anchor line names the issue and both parts");
  eq(JSON.stringify(items(lp)), JSON.stringify([
    "Keep Public Lands Public: supports · no record", "Expand Domestic Energy Production: opposes · no record", "Local Land Control: opposes · no record",
  ]), "Protect Public Lands lists every related issue with a published direction, in map order, with both parts");
  ok(/<span class="pdxri-rec r-none">no record<\/span>/.test(lp), "no votes: the record part says no record, neutral");
  ok(!/Cut Federal Red Tape/.test(lp), "a mixed related position is printed");
  eq(JSON.stringify(items(byIssue.lands_keep_public || "")),
     JSON.stringify(["Protect Public Lands: supports · no record", "Expand Domestic Energy Production: opposes · no record", "Local Land Control: opposes · no record"]),
     "Keep Public Lands Public lists Protect Public Lands and the same set");
  ok(!("gun_rights" in byIssue), "an issue with no related positions gets a group");
  ok(!("gov_regulation" in byIssue), "an issue with a mixed position gets a group");
  eq(RI.sectionHtml("oneSided", {}), "", "no related positions: no section");
  eq(RI.sectionHtml("none", {}), "", "no positions: no section");
  eq(RI.sectionHtml("lonely", {}), "", "positions on unrelated issues only: no section");

  const doors = [...h.matchAll(/<a class="pdxri-go" href="([^"]*)"(?: style="[^"]*")? data-pdxri-go="([^"]*)" data-pdxc-gap="([^"]*)" data-pdxc-gap-pid="([^"]*)"[^>]*>(?:<span class="pdxri-ico" aria-hidden="true">[^<]*<\/span> )?([^<]*)<\/a>/g)];
  const names = (h.match(/class="pdxri-issue"/g) || []).length;
  eq(doors.length, names, "every issue name in the section is a link");
  for (const d of doors) {
    eq(d[4], "lands", `${d[3]} link opens another person`);
    eq(d[2], d[3], `${d[3]} link has mismatched keys`);
    eq(d[5].replace(/&amp;/g, "&"), LBL(d[3]), `${d[3]} link text is not the register label`);
    ok(d[1].includes("lands") && d[1].includes(encodeURIComponent(d[3])), `${d[3]} fallback href is not this person on this issue`);
  }
  const gs = RI.groupsFor("lands", {});
  ok(gs.every((g) => g.related.every((it) => RI.MAP[g.issue.key].includes(it.key))), "a group lists a key the map does not relate");
}

// 2b. stated and record lines, two lines not one
{
  // Record readings stubbed on the shared index: lead advances → "with",
  // opposes → "against"; a split (no lead) or an uncharacterised read → none.
  const REC = {
    lands: { lands_preserve: "opposes", lands_balance: "advances", gun_rights: "advances" },
    recOnly: { lands_preserve: "opposes", lands_keep_public: "advances" },
    split: { lands_preserve: null, lands_keep_public: null },
    bare: { lands_preserve: null },
  };
  const w2 = boot(Object.assign({}, FIX, { recOnly: {}, split: { lands_preserve: st("support") }, bare: { lands_keep_public: st("support") } }));
  // `split` has no votes on file (total 0); `bare` has votes that ran no way.
  w2._pdxRecordDirection = (pid, key) => {
    const r = REC[pid] || {};
    if (!(key in r)) return null;
    return r[key] ? { characterised: true, lead: r[key], total: 3 } : { characterised: false, lead: null, total: pid === "bare" ? 2 : 0 };
  };
  const R2 = w2.PDXRelatedIssues;
  const h = R2.sectionHtml("lands", {});
  const groups = Object.fromEntries([...h.matchAll(/<li class="pdxri-group" data-pdxri-issue="([^"]+)">([\s\S]*?)<\/ul><\/li>/g)].map((g) => [g[1], g[2]]));
  const items = (html) => [...String(html || "").matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => strip(m[0]));
  const anchors = (html) => [...String(html || "").matchAll(/<div class="pdxri-anchor"[\s\S]*?<\/div>/g)].map((m) => strip(m[0]));
  eq(JSON.stringify(anchors(groups.lands_preserve)), JSON.stringify(["Protect Public Lands: supports · record runs against"]),
     "an issue with both readings prints one line, stated first");
  eq(JSON.stringify(items(groups.lands_keep_public)), JSON.stringify([
    "Protect Public Lands: supports · record runs against",
    "Expand Domestic Energy Production: opposes · no record", "Local Land Control: opposes · no record",
    `${LBL("lands_balance")}: no stated position · record runs with`,
  ]), "every related line shows a stated part and a record part, in map order");
  ok(items(groups.lands_keep_public).includes("Expand Domestic Energy Production: opposes · no record"),
     "a stated-only related issue says no record");
  ok(items(groups.lands_keep_public).includes(`${LBL("lands_balance")}: no stated position · record runs with`),
     "a record-only related issue says no stated position");
  ok(/<span class="pdxri-dir s-none">no stated position<\/span>/.test(h) && /<span class="pdxri-rec r-none">no record<\/span>/.test(h),
     "the absent parts carry the neutral classes");
  ok(/<span class="pdxri-rec r-against">record runs against<\/span>/.test(h), "record runs against does not carry the red class");
  ok(/<span class="pdxri-rec r-with">record runs with<\/span>/.test(h), "record runs with does not carry the green class");
  ok(!/class="pdxri-dir[^"]*">record/.test(h), "a record word is printed as a stated position");
  // Icons: every name is led by its chip icon, inside the one link.
  const names = [...h.matchAll(/<span class="pdxri-issue" data-pdxri-color="([^"]+)"[^>]*>(?:<a class="pdxri-go"[^>]*>)?(<span class="pdxri-ico" aria-hidden="true">([^<]*)<\/span> )?/g)];
  ok(names.length > 0, "no names to check for icons");
  for (const [, key, sp, ico] of names) {
    ok(!!sp && ico === w2.PDXRelatedIssues.iconOf(key) && ico !== "", `${key}: name lacks its issue icon`);
    ok(String(w2.ISSUE_MAP[key].label).startsWith(ico), `${key}: icon is not the issue's chip icon`);
  }
  ok(!/<\/a><span class="pdxri-ico"|pdxri-ico[^>]*><a /.test(h), "the icon is a second link or sits outside the link");
  ok(/data-pdxri-line="both" data-pdxri-dir="support" data-pdxri-rec="against"/.test(h) && /data-pdxri-line="both" data-pdxri-dir="none" data-pdxri-rec="with"/.test(h),
     "each line is marked with its stated and record parts");
  ok([...h.matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].every((m) => /class="pdxri-dir s-/.test(m[0]) && /class="pdxri-(rec r-|tally)/.test(m[0])),
     "a line is missing its stated or record part");
  const doors = [...h.matchAll(/<a class="pdxri-go"[^>]*data-pdxc-gap="([^"]*)"/g)];
  eq(doors.length, (h.match(/class="pdxri-issue"/g) || []).length, "every issue name on every line is a link");

  const ro = R2.sectionHtml("recOnly", {});
  const rg = Object.fromEntries([...ro.matchAll(/<li class="pdxri-group" data-pdxri-issue="([^"]+)">([\s\S]*?)<\/ul><\/li>/g)].map((g) => [g[1], g[2]]));
  eq(JSON.stringify(items(rg.lands_preserve)), JSON.stringify(["Keep Public Lands Public: no stated position · record runs with"]), "record-only file: no stated position beside the record");
  ok(!/pdxri-dir s-(support|oppose)/.test(ro), "record-only file prints a stated word");
  eq(R2.sectionHtml("split", {}), "", "a split or uncharacterised record gives no line, and nothing related is left");
  eq(R2.recordOf("lands", "gov_regulation"), null, "no record on file: no record reading");
  // Votes on file, no stance, no one-way read, no drawer ledger: the index's count.
  const bh = R2.sectionHtml("bare", {});
  const bg = Object.fromEntries([...bh.matchAll(/<li class="pdxri-group" data-pdxri-issue="([^"]+)">([\s\S]*?)<\/ul><\/li>/g)].map((g) => [g[1], g[2]]));
  eq(JSON.stringify(items(bg.lands_keep_public)), JSON.stringify(["Protect Public Lands: no stated position · 2 votes on file"]), "a votes-only related issue with no drawer ledger prints the index's count");
  ok(/data-pdxri-rec="tally"><span class="pdxri-issue"[^>]*><a class="pdxri-go"[^>]*data-pdxc-gap="lands_preserve"/.test(bh),
     "the votes-only name is a link");
  // With the drawer ledger's tally available, the votes-only line prints it.
  w2.PDXConsistency = { drawerTally: (pid, key) => key === "lands_preserve" ? { acts: 2, advances: 1, opposes: 1, tookNoSide: 0, noSide: false } : null };
  const th = R2.sectionHtml("bare", {});
  const tg = Object.fromEntries([...th.matchAll(/<li class="pdxri-group" data-pdxri-issue="([^"]+)">([\s\S]*?)<\/ul><\/li>/g)].map((g) => [g[1], g[2]]));
  eq(JSON.stringify(items(tg.lands_keep_public)), JSON.stringify(["Protect Public Lands: no stated position · 1 for · 1 against"]), "a split related issue prints no stated position and the drawer tally");
  ok(/data-pdxri-rec="tally">[\s\S]*?<\/a>:<\/span> <span class="pdxri-dir s-none">no stated position<\/span><span class="pdxri-sep"> · <\/span><span class="pdxri-tally">1 for · 1 against<\/span><\/li>/.test(th),
     "the tally is a neutral span after the stated part");
  ok(!/pdxri-tally[^>]*(r-with|r-against|s-support|s-oppose)/.test(th), "the tally carries a green / red class");
  w2.PDXConsistency = { drawerTally: () => ({ acts: 1, advances: 0, opposes: 0, tookNoSide: 1, noSide: true }) };
  ok(R2.sectionHtml("bare", {}).includes('<span class="pdxri-tally">1 formal act</span>'), "a no-pole subject prints its act count, not a side");
  eq(R2.sectionHtml("split", {}), "", "no votes and no stance: still omitted with a tally reader loaded");
  delete w2.PDXConsistency;
}

// 3b. every name in its issue chip colour
{
  const h = RI.sectionHtml("lands", {});
  const spans = [...h.matchAll(/<span class="pdxri-issue" data-pdxri-color="([^"]+)" style="([^"]*)">/g)];
  ok(spans.length > 0, "no coloured names in the section");
  eq(spans.length, (h.match(/class="pdxri-issue"/g) || []).length, "an issue name has no colour token");
  for (const [, key, style] of spans) eq(style, win.PDXIssueColors.styleFor(key) + `color:${win.PDXIssueColors.getIssueColor(key).ink};`, `${key}: not its issue chip colour`);
  ok(/s-support">supports</.test(h) && /s-oppose">opposes</.test(h), "position words lost their green / red class");
}

// 4. no verdict
{
  const h = RI.sectionHtml("lands", {});
  ok(!/%|score|grade|contradict|match|inconsisten|consistent/i.test(strip(h)), "verdict wording in the section: " + strip(h));
}

// 5. real data
{
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["politician-stances-core.js", "politician-stances-ext.js", ...Array.from({ length: 16 }, (_, i) => i ? `state-senate-stances-w${i + 1}.js` : "state-senate-stances.js"), "stance-helpers.js", "issue-map.js", "related-issues.js"]) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`load ${f}: ${e.message}`); }
  }
  const SD = w.ISSUE_STANCE_DATA || vm.runInContext("typeof ISSUE_STANCE_DATA!=='undefined'?ISSUE_STANCE_DATA:null", ctx);
  ok(SD && typeof w._polPositionMap === "function", "real stance corpus and position map load");
  if (SD && typeof w._polPositionMap === "function") {
    const before = JSON.stringify(SD);
    let shown = 0, lines = 0, bad = 0;
    for (const pid of Object.keys(SD)) {
      const gs = w.PDXRelatedIssues.groupsFor(pid, { name: "" });
      const pm = w._polPositionMap(pid, { name: "" });
      const h = w.PDXRelatedIssues.sectionHtml(pid, { name: "" });
      if (!gs.length) { if (h !== "") bad++; continue; }
      shown++;
      for (const g of gs) {
        const ks = g.related.map((it) => it.key);
        if (new Set(ks).size !== ks.length || ks.includes(g.issue.key)) bad++;
      }
      // Rendered: every line element carries exactly one stated and one record part.
      for (const m of h.matchAll(/<(li|div) class="pdxri-(item|anchor)"[\s\S]*?<\/\1>/g)) {
        if ((m[0].match(/class="pdxri-dir s-/g) || []).length !== 1 || (m[0].match(/class="pdxri-(rec r-|tally)/g) || []).length !== 1) bad++;
      }
      for (const g of gs) for (const it of [g.issue, ...g.related]) {
        lines++;
        if (it.dir && pm[it.key].stance !== it.dir) bad++;
        if (w.PDXRelatedIssues.lineTexts(it).length !== 1) bad++;
        for (const l of w.PDXRelatedIssues.lineTexts(it)) {
          if (!/^[A-Za-z0-9 &,+\-'.:()]+: (supports|opposes|no stated position) · (record runs with|record runs against|no record|\d+ for · \d+ against( · \d+ took no side)?|\d+ formal acts?|\d+ votes? on file)$/.test(l)) bad++;
        }
      }
    }
    eq(bad, 0, "every real line reads the published stance and the fixed vocabulary");
    ok(shown > 0, "at least one real person file carries related issues");
    eq(JSON.stringify(SD), before, "stance corpus is not mutated");
    console.log(`   real corpus: ${shown} files with related issues · ${lines} lines`);
  }
}

// 6. wiring
{
  const pf = R("profiles-full.js");
  const i = pf.indexOf("window.PDXRelatedIssues.sectionHtml(id, p)");
  ok(i > 0, "profiles-full.js calls the section");
  const before = pf.lastIndexOf("<!--PDXSP:", i);
  ok(pf.slice(before, before + 20).startsWith("<!--PDXSP:explore-->"), "section sits in the explore stage, after the topic tree");
  ok(/typeof window\.PDXRelatedIssues\.sectionHtml === 'function'/.test(pf), "the call is guarded");
  for (const page of ["index.html", "person.html", "ballot.html", "issue.html"]) {
    ok(R(page).includes('<script defer src="/related-issues.js"></script>'), `${page} loads related-issues.js`);
  }
  const sw = R("sw.js");
  ok(sw.includes("'/related-issues.js',"), "related-issues.js is precached");
  const v = Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v >= 504, "shell version bumped for the map");
  const mod = R("related-issues.js");
  // The one read of consistency.js allowed is the drawer ledger's tally.
  const code = mod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const rest = code.replace("var LG = window.PDXConsistency;", "");
  ok(!/PDXConsistency|_issueVerdict|directionMatch|_DOS_EFFECT/.test(rest) &&
     [...rest.matchAll(/\bLG\.(\w+)/g)].every((m) => m[1] === "drawerTally"),
     "module reads no scoring or effect engine");
}

if (failures.length) {
  console.error(`\n✗ related-issues: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues: all ${passed} assertions passed`);
