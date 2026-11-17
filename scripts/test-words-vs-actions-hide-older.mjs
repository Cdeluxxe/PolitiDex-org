#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-words-vs-actions-hide-older.mjs — the device-only "hide older-vote
// notes" preference for Words and votes
// ─────────────────────────────────────────────────────────────────────────────
// related-issues.js reads one localStorage key (pdx_wva_hide_older_v1, '1' =
// on) inside wordsVsActionsFor, the note function every drawer and the
// person-file section call. Pins:
//   1. off (no key, or any value but '1'): recent and older notes both appear,
//      byte-identical to a document that has never seen the key
//   2. on: notes naming an older fallback vote are omitted; recent notes keep
//      their exact markup and place; a drawer whose only note is older has no
//      note block, byte-identical to one where the note cannot fire
//   3. the person-file section follows the same preference
//   4. the real corpus: with it on, every surviving note is a recent one and
//      byte-identical to its "off" twin; every dropped note was cued older
//   5. the switch: a plain toggle on the stance page, device-only, defaulting
//      to show; no new route, score, sync or stored state elsewhere
//
//   node scripts/test-words-vs-actions-hide-older.mjs   (no database, no network)

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
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js", "stance-helpers.js",
  "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js", "related-issues.js"];
const corpus = buildCorpus(ROOT);
const mem = {};
const win = makeSandbox();
win.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
win.PROFILES = win.CMP_DATA;
for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
const CS = win.PDXConsistency, RI = win.PDXRelatedIssues, W = RI.WVA_WINDOW;
const KEY = "pdx_wva_hide_older_v1";
eq(RI.WVA_HIDE_OLDER_KEY, KEY, "the preference has one device key");
const realActs = CS.wordsVsActionsActs;
const NOW = Date.parse("2026-11-17T12:00:00Z");
const DEFAULT = { recent: W.recent, cutoff: W.cutoff, now: W.now };
const pref = (v) => { if (v == null) delete mem[KEY]; else mem[KEY] = v; };
const sides = (m) => { win.PDXStanceSides = m ? { list: () => Object.entries(m).map(([key, position]) => ({ key, position, priority: "medium" })) } : undefined; };
const BLOCK = /<div class="pdxri-wva"[\s\S]*?<\/ul><\/div>/g;
const items = (h) => h.match(/<li class="pdxri-wva-item"[\s\S]*?<\/li>/g) || [];
const statedOf = (pid, k) => { const e = (win._polPositionMap(pid, win.CMP_DATA[pid]) || {})[k]; const s = String(e && e.stance || ""); return /^(support|oppose)$/.test(s) ? s : null; };
const AG = (s) => (s === "support" ? "opposes" : "advances");

// ── fixture: a person, an open issue, and TWO related issues with a stated side
// each, so one can carry a recent conflicting vote and the other an older one.
let fx = null;
for (const pid of Object.keys(win.CMP_DATA)) {
  const p = win.CMP_DATA[pid];
  for (const open of Object.keys(RI.MAP)) {
    const its = (RI.itemsFor(pid, p, open) || []).filter((it) => statedOf(pid, it.key));
    if (its.length >= 2 && !statedOf(pid, open)) { fx = { pid, open, a: its[0].key, sa: statedOf(pid, its[0].key), b: its[1].key, sb: statedOf(pid, its[1].key) }; break; }
  }
  if (fx) break;
}
ok(!!fx, "fixture: an open issue with two related issues carrying a stated side");
const act = (side, ident, date) => ({ dir: AG(side), word: "Nay", ident, date, url: "", from: "curated", procedural: false });
const ACTS = {
  [fx.a]: [act(fx.sa, "H.R. 101", "2026-04-01T00:00:00Z")],   // recent
  [fx.b]: [act(fx.sb, "H.R. 202", "2019-04-01T00:00:00Z")],   // older fallback
};
function view(acts) {
  Object.assign(W, DEFAULT, { now: () => NOW });
  CS.wordsVsActionsActs = (pid, key) => (pid === fx.pid && acts[key] ? acts[key].map((x) => ({ ...x })) : []);
  try { return { drawer: CS.gapViewHtml(fx.pid, fx.open) || "", note: RI.wordsVsActionsHtml(fx.pid, win.CMP_DATA[fx.pid], fx.open) || "",
    section: RI.sectionHtml(fx.pid, win.CMP_DATA[fx.pid]) || "" }; }
  finally { CS.wordsVsActionsActs = realActs; Object.assign(W, DEFAULT); }
}
sides({ [fx.a]: fx.sa, [fx.b]: fx.sb });

// ── 1 · off ──────────────────────────────────────────────────────────────────
pref(null);
const off = view(ACTS);
const li = items(off.note);
eq(li.length, 2, "off: both the recent and the older note appear");
ok(li.some((x) => /H\.R\. 101 \(2026-04-01\), which ran against it/.test(x)), "off: the recent note, uncued");
ok(li.some((x) => /H\.R\. 202 \(2019-04-01\), an older vote, which ran/.test(x) && /data-pdxri-wva-older="1"/.test(x)), "off: the older note, cued");
for (const v of ["0", "", "true", "yes"]) { pref(v); eq(view(ACTS), off, `value ${JSON.stringify(v)} counts as off → byte-identical`); }
pref("1"); RI.setWvaHideOlder(false);
ok(!(KEY in mem), "turning it off removes the key (the default state is no key at all)");
eq(view(ACTS), off, "after turning it off → byte-identical to never set");
ok(RI.wvaHideOlder() === false, "default is off");

// ── 2 · on ───────────────────────────────────────────────────────────────────
RI.setWvaHideOlder(true);
eq(mem[KEY], "1", "turning it on stores '1' on this device");
ok(RI.wvaHideOlder() === true, "on is read back");
const on = view(ACTS);
const liOn = items(on.note);
eq(liOn.length, 1, "on: only one note remains");
eq(liOn[0], li.find((x) => /H\.R\. 101/.test(x)), "on: the recent note is byte-identical");
ok(!/an older vote|data-pdxri-wva-older/.test(on.drawer), "on: no older note in the drawer");
eq(on.drawer, off.drawer.replace(li.find((x) => /H\.R\. 202/.test(x)), ""), "on: the drawer is the off drawer minus the older note, nothing else");
const onlyOld = { [fx.b]: ACTS[fx.b] };
const ooOn = view(onlyOld);
ok(!/pdxri-wva/.test(ooOn.drawer), "on: a drawer whose only note is older has no note block");
eq(ooOn.drawer, view({}).drawer, "on: …byte-identical to a drawer where the note cannot fire");
const onlyNew = { [fx.a]: ACTS[fx.a] };
const onN = view(onlyNew);
RI.setWvaHideOlder(false);
eq(onN, view(onlyNew), "on vs off with only a recent vote → byte-identical everywhere");
RI.setWvaHideOlder(true);

// ── 3 · the person-file section ──────────────────────────────────────────────
{
  const sOff = (pref(null), view(ACTS).section);
  pref("1");
  const sOn = view(ACTS).section;
  const lOff = items(sOff), lOn = items(sOn);
  ok(lOff.some((x) => /H\.R\. 202/.test(x)), "section, off: the older note appears");
  ok(!lOn.some((x) => /H\.R\. 202/.test(x)), "section, on: the older note is omitted");
  eq(lOn, lOff.filter((x) => !/data-pdxri-wva-older/.test(x)), "section, on: the recent notes are byte-identical");
  const sOO = view(onlyOld).section;
  pref(null);
  eq(sOO, (sides(null), view({}).section), "section, on, only an older vote → the section as it is with no note");
  sides({ [fx.a]: fx.sa, [fx.b]: fx.sb });
}

// ── 4 · the real corpus ──────────────────────────────────────────────────────
{
  Object.assign(W, DEFAULT, { now: () => NOW });
  let n = 0, dropped = 0, kept = 0;
  for (const pid of Object.keys(win.CMP_DATA)) {
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    const m = {};
    for (const k of Object.keys(pm)) { const s = statedOf(pid, k); if (s) m[k] = s; }
    if (!Object.keys(m).length) continue;
    sides(m);
    for (const open of Object.keys(RI.MAP)) {
      pref(null);
      const a = RI.wordsVsActionsHtml(pid, win.CMP_DATA[pid], open) || "";
      if (!a) continue;
      pref("1");
      const b = RI.wordsVsActionsHtml(pid, win.CMP_DATA[pid], open) || "";
      const la = items(a), lb = items(b);
      eq(lb, la.filter((x) => !/data-pdxri-wva-older/.test(x)), `${pid}/${open}: on keeps exactly the recent notes, unchanged`);
      if (!lb.length) eq(b, "", `${pid}/${open}: nothing recent → no block`);
      dropped += la.length - lb.length; kept += lb.length; n++;
    }
    if (n >= 400) break;
  }
  pref(null);
  Object.assign(W, DEFAULT);
  ok(n > 0, "real corpus: notes compared");
  console.log(`   real corpus: ${n} note blocks · ${kept} recent notes kept · ${dropped} older notes hidden with the preference on`);
}

// ── 5 · the switch, and nothing else ─────────────────────────────────────────
{
  const ms = R("my-stances.js"), html = R("my-stances.html"), ri = R("related-issues.js");
  ok(/function renderWvaPref\(\)/.test(ms) && /html \+= renderWvaPref\(\);/.test(ms), "the stance page renders the switch");
  ok(/data-ms-wva-older="1"' \+ \(show \? ' checked' : ''\)/.test(ms), "the switch is a checkbox, checked (shown) by default");
  ok(/matches\('\[data-ms-wva-older\]'\)\)[\s\S]{0,160}setWvaHideOlder\(!t\.checked\)/.test(ms), "flipping it calls the shared setter");
  ok(/Saved on this device only\./.test(ms), "the switch says it is device-only");
  ok(!/pdx_wva_hide_older/.test(ms), "the stance page holds no second copy of the key");
  ok(html.indexOf('src="/related-issues.js"') >= 0 && html.indexOf('src="/related-issues.js"') < html.indexOf('src="/my-stances.js"'), "my-stances.html loads the note module before the stance page");
  eq((ri.match(/pdx_wva_hide_older_v1/g) || []).length, 1, "the key is named once");
  ok(/if \(wvaHideOlder\(\)\) out = out\.filter/.test(ri.slice(ri.indexOf("function wordsVsActionsFor"), ri.indexOf("function wvaItemHtml"))), "the preference is read in wordsVsActionsFor");
  ok(!/pdx_wva_hide_older|wvaHideOlder/.test(R("consistency.js") + R("word-action.js") + R("voting-record.js") + R("profiles-full.js") + R("stance-sides.js")), "no scoring, record or stance-sync file reads it");
  const blk = ri.slice(ri.indexOf("THE HIDE-OLDER PREFERENCE"), ri.indexOf("function wvaOlderCue"));
  ok(blk && !/score|confiden|fetch\(/i.test(blk), "the preference adds no score, confidence or request");
  const toml = R("netlify.toml").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  ok(!/wva|hide-older/i.test(toml), "no new route");
}

if (failures.length) {
  console.log(`\n✗ words vs actions hide-older: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ words vs actions hide-older: ${passed} checks passed`);
