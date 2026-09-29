#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-tree-find.mjs — 🌳 "Find a topic" on the person file
// ─────────────────────────────────────────────────────────────────────────────
// One field above All Issues by Topic narrows the tree to the issues already on
// this file that answer what a reader typed. The fence:
//
//   1. IT MATCHES THE LABEL, A SHARED ALIAS, OR A MEASURE ON THIS FILE. Case-
//      insensitive, "&" and "+" read as "and", "/" and emoji as a space. A bill
//      title finds a row only when that bill sits on THIS person × THAT issue;
//      a title on someone else's file finds nothing here.
//   2. NON-MATCHES HIDE, AND SO DO THEIR CONTAINERS. No branch and no mid is
//      built without a visible leaf in it. An empty query is the full tree.
//   3. NO MATCH IS ONE LINE AND NO ISSUE. The miss prints FIND_NONE and zero
//      leaves — never an invented row.
//   4. THE DOOR IS THE SAME DOOR. A matching leaf carries the same dossier door
//      and the same record slot it carries without a query.
//   5. ONE OWNER. The field comes from sectionHtml, so every person file that
//      paints the tree — Lee, Curtis, a generated file — carries it.
//
//   node scripts/test-stance-tree-find.mjs

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
const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ find a topic: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

const T = win.PDXStanceTree;
must(!!T && typeof T.findMatches === "function", "PDXStanceTree.findMatches is not published");

// ── The Lee fixture ──────────────────────────────────────────────────────────
// Lee's cold tree has no Protect Public Lands or Cut Federal Red Tape row, so one
// roll call each is seeded the way a finished /api/voting-record fetch leaves the
// cache. The bill title carries a word no label on the file holds, which is what
// proves the field reads labels and not titles.
const PID = "lee";
const vote = (n, issueKey, title) => ({
  kind: "vote", rollcallId: 900 + n, measureId: 1900 + n, number: "S. " + (40 + n),
  date: "2025-03-1" + n, action: "On Passage", position: "yea", isProcedural: false,
  title, source: { url: "https://www.senate.gov/rc/" + n, label: "Senate.gov" },
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
win.PDXVotingRecord.noteMember(PID, [
  vote(1, "lands_preserve", "Xylophone Watershed Conveyance Act"),
  vote(2, "gov_regulation", "Xylophone Paperwork Act"),
]);

const labelOf = (key) => (win.ISSUE_MAP[key] || {}).label;
const LANDS = labelOf("lands_preserve");
const TAPE = labelOf("gov_regulation");
const GUNS = labelOf("gun_rights") || "";
const ALL = T.leaves(PID);
const labels = ALL.map((l) => l.label);
must(labels.includes(LANDS), `Lee's tree has no ${LANDS} row to find`);
must(labels.includes(TAPE), `Lee's tree has no ${TAPE} row to find`);
const OTHER = labels.find((l) => !/land/i.test(l) && l !== TAPE);
must(!!OTHER, "Lee's tree has no unrelated row to hide");

// The markup a reader can see: leaves inside open branches, or the flat list.
const visible = (html) => {
  const s = String(html);
  const names = [];
  const grab = (chunk) => {
    for (const m of chunk.matchAll(/<span class="pdxtree-name">([^<]*)<\/span>/g)) names.push(m[1]);
  };
  s.split('<div class="pdxtree-branch').slice(1)
    .filter((b) => /data-pdxtree-open="1"/.test(b)).forEach(grab);
  const flat = s.split('<div class="pdxtree-flat')[1];
  if (flat) grab(flat.split('<div class="pdxtree-branch')[0]);
  return names.map((n) => n.replace(/&amp;/g, "&"));
};
const leafCount = (html) => (String(html).match(/data-pdxtree-issue="/g) || []).length;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · lands finds Protect Public Lands and hides an unrelated row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const full = T.html(PID, { uid: "f" });
  const hit = T.html(PID, { uid: "f", query: "lands" });
  const vis = visible(hit);
  ok(vis.includes(LANDS), `"lands" leaves ${LANDS} visible`);
  ok(!vis.includes(OTHER), `"lands" hides ${OTHER}`);
  ok(!hit.includes(`>${OTHER.replace(/&/g, "&amp;")}<`), `${OTHER} is not in the markup at all under "lands"`);
  if (GUNS && labels.includes(GUNS)) ok(!vis.includes(GUNS), `"lands" hides ${GUNS}`);
  ok(vis.every((n) => /lands/i.test(n)), `every visible row under "lands" says lands (${vis.join(" | ")})`);
  eq(visible(T.html(PID, { uid: "f", query: "LANDS" })).join("|"), vis.join("|"), "the match is case-insensitive");

  const back = T.html(PID, { uid: "f", query: "" });
  eq(back, full, "an empty query restores the full tree, byte for byte");
  eq(T.html(PID, { uid: "f", query: "   " }), full, "a blank query is an empty query");
  eq(leafCount(back), ALL.length, "the restored tree carries every leaf");
  ok(back.includes(`>${LANDS}<`) && back.includes(`>${OTHER.replace(/&/g, "&amp;")}<`),
    "both the match and the unrelated row are back");

  const tape = visible(T.html(PID, { uid: "f", query: "red tape" }));
  ok(tape.includes(TAPE), `"red tape" finds ${TAPE}`);
  eq(tape.length, 1, `"red tape" finds exactly one row`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the words people type match labels with & / +");
// ═════════════════════════════════════════════════════════════════════════════
{
  const M = T.findMatches;
  const AMP = "⚖️ Tariffs & Trade Authority";
  ok(M(AMP, "tariffs and trade"), "& matches a typed \"and\"");
  ok(M(AMP, "tariffs trade"), "& matches the two words either side of it");
  ok(M(AMP, "Tariffs & Trade"), "& matches a typed &");
  ok(M(AMP, "trade"), "one word inside an & label matches");
  ok(M("⚖️ Secure Border + Legal Pathways", "border and legal"), "+ matches a typed \"and\"");
  ok(M("⚖️ Secure Border + Legal Pathways", "border legal"), "+ matches the words either side");
  ok(M("🏳️‍🌈 Protect LGBTQ+ Rights", "lgbtq rights"), "a trailing + does not block the word before it");
  ok(M("🕊 Abortion / Reproductive Rights", "abortion reproductive"), "/ reads as a space");
  ok(M("🕊 Abortion / Reproductive Rights", "abortion/reproductive"), "a typed / reads as a space too");
  ok(!M(AMP, "tariffs housing"), "every typed word has to be in the label");
  ok(!M(AMP, "authority x"), "a stray word still has to match");

  // The same rule on a real Lee row with an & in it.
  const amp = labels.find((l) => /&/.test(l));
  must(!!amp, "Lee's tree has no & label to type against");
  const words = amp.replace(/[^A-Za-z ]+/g, " ").trim().split(/\s+/).slice(0, 2).join(" and ");
  ok(visible(T.html(PID, { uid: "f", query: words })).includes(amp), `"${words}" finds ${amp} on Lee's file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · branches and mids with no visible child are not built");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Wide enough to leave the flat threshold, so branches actually render.
  const q = "e";
  const hit = T.html(PID, { uid: "f", query: q });
  const branches = hit.split('<div class="pdxtree-branch').slice(1);
  ok(branches.every((b) => leafCount(b) > 0), "every built branch holds a matching leaf");
  ok(branches.every((b) => /data-pdxtree-open="1"/.test(b)), "every surviving branch is open under a query");
  const mids = hit.split('<div class="pdxtree-mid"').slice(1)
    .map((m) => m.split('<div class="pdxtree-mid"')[0].split('<div class="pdxtree-branch')[0]);
  ok(mids.every((m) => leafCount(m) > 0), "every built mid holds a matching leaf");
  const narrow = T.html(PID, { uid: "f", query: "lands" });
  const fullBranches = (T.html(PID, { uid: "f" }).match(/data-pdxtree-branch="/g) || []).length;
  const narrowBranches = (narrow.match(/data-pdxtree-branch="/g) || []).length;
  ok(narrowBranches < fullBranches || /pdxtree-flat/.test(narrow),
    "a narrow query drops the topics that hold no match");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no match is one line and no invented issue");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(T.FIND_NONE, "No topic on this file matches.", "the miss line is the shipped copy");
  const miss = T.html(PID, { uid: "f", query: "zzqx" });
  eq(leafCount(miss), 0, "a miss renders zero issue rows");
  eq((miss.match(/data-pdxtree-branch="/g) || []).length, 0, "a miss renders zero branches");
  eq((miss.match(/No topic on this file matches\./g) || []).length, 1, "a miss says so exactly once");
  eq(T.find(ALL, "zzqx").length, 0, "the leaf filter returns nothing for a miss");
  eq(T.leaves(PID).length, ALL.length, "a query never changes the leaf set it filters");

}

// ═════════════════════════════════════════════════════════════════════════════
section("4b · a measure title on THIS file finds its row; another file's does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Lee's seeded "Xylophone" roll calls sit on lands_preserve and gov_regulation,
  // so their titles now find exactly those two rows — and nothing else.
  const xy = T.find(ALL, "xylophone").map((l) => l.key).sort();
  eq(xy.join("|"), "gov_regulation|lands_preserve", "a bill title on this file finds the rows it sits on");
  eq(T.find(ALL, "watershed conveyance").map((l) => l.key).join("|"), "lands_preserve",
    "a title phrase finds only the issue that measure is on");
  eq(leafCount(T.html(PID, { uid: "f", query: "xylophone" })), 2, "the title hits render as the existing leaves");

  // MUTATION: a matcher that read titles from another person's file (or the
  // archive) would surface a Lee row for a title that only sits on Curtis's.
  const CUR = "curtis";
  win.PDXVotingRecord.noteMember(CUR, [
    { ...vote(7, "lands_preserve", "Quokka Meadow Protection Act"), rollcallId: 977, measureId: 1977 },
  ]);
  ok(T.find(T.leaves(CUR), "quokka").some((l) => l.key === "lands_preserve"),
    "the Curtis-only title finds Curtis's own row");
  eq(T.find(T.leaves(PID), "quokka").length, 0, "a title on another person's file finds no row on this one");
  eq(leafCount(T.html(PID, { uid: "f", query: "quokka" })), 0, "and renders zero rows here");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4c · aliases: iran on Trump opens real leaves, never an invented one");
// ═════════════════════════════════════════════════════════════════════════════
{
  const A = T.FIND_ALIASES;
  for (const k of Object.keys(A)) ok(!!win.ISSUE_MAP[k], `alias key ${k} is in the vocabulary`);
  ok((A.war_powers || []).includes("iran"), "iran is an alias on War Powers");
  ok((A.restraint || []).includes("iran") && (A.restraint || []).includes("ukraine"),
    "iran and ukraine are aliases on Diplomacy & Restraint");
  ok((A.strong_defense || []).includes("ukraine"), "ukraine is an alias on Peace Through Strength");
  ok(!(A.war_powers || []).includes("war"), "war is not duplicated as an alias of a label that says war");

  const TP = "trump";
  const TL = T.leaves(TP);
  must(TL.length > 0, "Trump's tree renders no leaves");
  const onFile = new Set(TL.map((l) => l.key));
  const iran = T.find(TL, "iran");
  const iranKeys = iran.map((l) => l.key);
  ok(iran.length > 0, "iran is no longer empty on Trump's file");
  ok(!/pdxtree-findnone/.test(T.html(TP, { uid: "t", query: "iran" })), "iran does not print the miss line");
  for (const k of ["war_powers", "restraint", "israel_support"]) {
    if (onFile.has(k)) ok(iranKeys.includes(k), `iran surfaces ${k} on Trump's file`);
  }
  // MUTATION: an alias that inserted a row for a key not on the file.
  ok(iranKeys.every((k) => onFile.has(k)), "every iran hit is a key already on Trump's file");
  eq(leafCount(T.html(TP, { uid: "t", query: "iran" })), iran.length, "iran renders exactly the matching leaves");
  const tHtml = T.html(TP, { uid: "t", query: "iran" });
  const rendered = [...tHtml.matchAll(/data-pdxtree-issue="([^"]*)"/g)].map((m) => m[1]);
  ok(rendered.every((k) => onFile.has(k)), "no rendered row carries a key off Trump's file");
  if (!onFile.has("israel_support")) ok(!rendered.includes("israel_support"), "Support for Israel is not invented for Trump");

  const uk = T.find(TL, "ukraine").map((l) => l.key);
  for (const k of ["strong_defense", "restraint"]) if (onFile.has(k)) ok(uk.includes(k), `ukraine surfaces ${k}`);
  ok(uk.every((k) => onFile.has(k)), "every ukraine hit is on Trump's file");

  // A measure title on Trump's own file: EO 14353 sits under War Powers.
  const eoRows = (win.PDXConsistency.dossierItems(TP, "war_powers") || []).filter((d) => /14353/.test(d.ident || ""));
  if (eoRows.length) ok(T.find(TL, "14353").some((l) => l.key === "war_powers"), "14353 finds War Powers on Trump's file");

  const zz = T.html(TP, { uid: "t", query: "xyzzy" });
  eq(leafCount(zz), 0, "xyzzy renders zero rows on Trump's file");
  eq((zz.match(/No topic on this file matches\./g) || []).length, 1, "xyzzy prints the miss line once");
  eq(T.html(TP, { uid: "t", query: "" }), T.html(TP, { uid: "t" }), "an empty query restores Trump's tree");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4d · aliases do not hide a label hit");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(T.find(ALL, "lands").some((l) => l.key === "lands_preserve"), "lands still finds Protect Public Lands on Lee");
  ok(visible(T.html(PID, { uid: "f", query: "lands" })).includes(LANDS), "and it is visible");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a match opens the same door, with the same record on it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const leafChunk = (html, key) => {
    for (const c of String(html).split('<div class="pdxtree-leaf').slice(1)) {
      if ((c.match(/data-pdxtree-issue="([^"]*)"/) || [])[1] === key) return c.slice(0, c.indexOf("</button>"));
    }
    return "";
  };
  const a = leafChunk(T.html(PID, { uid: "f" }), "lands_preserve");
  const b = leafChunk(T.html(PID, { uid: "f", query: "lands" }), "lands_preserve");
  ok(!!b && /data-pdxtree-dos="lands_preserve"/.test(b), "the matching row carries the dossier door");
  eq(b, a, "the matching row's face is byte-identical to the unsearched one");
  ok(!/href=/.test(b), "the face navigates nowhere");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one field, from the section, on every person file that lists issues");
// ═════════════════════════════════════════════════════════════════════════════
{
  const pids = [PID, "curtis"];
  // A generated file: any profile other than the hand-built ones whose tree renders.
  const gen = Object.keys(win.CMP_DATA || {}).find((k) =>
    !pids.includes(k) && (() => { try { return T.leaves(k).length > 0; } catch (e) { return false; } })());
  if (gen) pids.push(gen);
  // Johnson, by whichever id the file carries.
  const johnson = Object.keys(win.CMP_DATA || {}).find((k) => /johnson/i.test(k) &&
    (() => { try { return T.leaves(k).length > 0; } catch (e) { return false; } })());
  if (johnson) pids.push(johnson);
  must(pids.length >= 3, "no generated profile renders a tree to check");
  for (const pid of pids) {
    const sec = T.sectionHtml(pid);
    eq((sec.match(/data-pdxtree-find="/g) || []).length, 1, `${pid}: one Find a topic field`);
    ok(/placeholder="Find a topic"/.test(sec), `${pid}: the placeholder reads Find a topic`);
    ok(sec.indexOf("data-pdxtree-find") < sec.indexOf('class="pdxtree-body"'),
      `${pid}: the field sits above the topics list, outside the re-rendered body`);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
