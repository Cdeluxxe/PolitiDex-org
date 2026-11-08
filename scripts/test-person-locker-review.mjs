#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-person-locker-review.mjs — manual review flags on the person profile.
//
// Boots the real profile engines (same stack as test-person-locker-pledge.mjs)
// and feeds profile-locker.js the body /api/evidence-locker/items actually
// serves (listLockerEntries over a fake store + a review-flag file) with three
// strong items on one person:
//   · HIDDEN   — flagged "hidden": served by no one, printed nowhere;
//   · REVIEWED — flagged "reviewed": printed with the small "Reviewed" note;
//   · PLAIN    — unflagged: printed exactly as before, no note.
// A hidden item handed to the profile directly (bypassing the endpoint) is
// also dropped, so the profile fails closed on its own.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { lockerKey, toSpotlightEntry } from "../netlify/lib/evidence-locker-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const failures = [];
let passed = 0;
const ok = (c, m) => { if (c) passed++; else failures.push(m); };

const { listLockerEntries } = await import(pathToFileURL(join(ROOT, "netlify/functions/evidence-locker-items.mts")).href);

const html = read("person.html");
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js", "related-issues.js",
  "profile-evidence.js", "profiles-full.js", "gaps.js",
];
const SRC = new Map([...ENGINE, "profile-locker.js"].map((f) => [f, read(f)]));
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const PID = "james_talarico";

const boot = () => {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) vm.runInContext(SRC.get(f), sb, { filename: f });
  for (const t of TAGS) {
    if (!/\bsrc\s*=/.test(t.attrs) && /window\.PDXStance\s*=/.test(t.body)) vm.runInContext(t.body, sb, { filename: "person.html PDXStance" });
  }
  vm.runInContext(SRC.get("profile-locker.js"), sb, { filename: "profile-locker.js" });
  win.PROFILES = win.CMP_DATA;
  return win;
};
const views = (win) => {
  const p = win.CMP_DATA[PID];
  return [
    win.PDXGaps.sectionHtml(PID, p) || "",
    win._renderEvidenceConnections(PID, p) || "",
    win.PDXStanceTree.sectionHtml(PID) || "",
    win.PDXWordAction.sectionHtml(PID, p) || "",
  ].join("\n");
};

const item = (n, topic) => ({
  politician_id: PID, topic, position: "support", confidence: 0.91, strength: "strong",
  source_type: "campaign issue page", link: `https://example.org/review/${n}`,
  excerpt: `Review fixture excerpt ${n}`, attribution: "Source: campaign page", date: "2026-11-01", rules_version: "test",
});
const HIDDEN = item("hidden", "public_schools");
const REVIEWED = item("reviewed", "healthcare");
const PLAIN = item("plain", "housing_build");
const store = (() => {
  const data = new Map([HIDDEN, REVIEWED, PLAIN].map((it) => [lockerKey(it), it]));
  return { async list() { return { blobs: [...data.keys()].map((key) => ({ key })) }; }, async get(k) { return data.get(k) ?? null; } };
})();
const FLAGS = { items: [
  { key: lockerKey(HIDDEN), status: "hidden" },
  { politician_id: PID, link: REVIEWED.link, status: "reviewed" },
] };

console.log("person: Evidence Locker manual review flags");
try {
  const body = await listLockerEntries(store, FLAGS);
  ok(body.count === 2 && body.hidden === 1, `endpoint: 2 served, 1 hidden (got ${body.count}/${body.hidden})`);

  const win = boot();
  const r = win.PDXProfileLocker.onBody(JSON.parse(JSON.stringify(body)));
  ok(r && r.added === 2, `profile ingests the two served items (got ${r && r.added})`);
  const out = views(win);
  ok(!out.includes("Review fixture excerpt hidden") && !out.includes(HIDDEN.link), "hidden: the item appears nowhere in the profile output");
  ok(out.includes("Review fixture excerpt reviewed"), "reviewed: the item is shown");
  ok(out.includes("Review fixture excerpt plain"), "plain: the unflagged item is shown");
  const tree = win.PDXStanceTree.sectionHtml(PID) || "";
  const line = (h, needle) => {
    const at = h.indexOf(needle);
    if (at === -1) return "";
    const s = h.lastIndexOf("<div class=\"pdxtree-locker", at);
    const e = h.indexOf("</div>", at);
    return h.slice(s, e + 6);
  };
  const revLine = line(tree, "Review fixture excerpt reviewed");
  const plainLine = line(tree, "Review fixture excerpt plain");
  ok(/data-pdx-locker-reviewed="1"/.test(revLine) && />✓ Reviewed</.test(revLine), "reviewed: its topic-tree line carries the Reviewed note");
  ok(plainLine && !/data-pdx-locker-reviewed/.test(plainLine), "plain: no Reviewed note on an unflagged item");
  const notes = (out.match(/data-pdx-locker-reviewed="1"/g) || []).length;
  const shown = (out.match(/Review fixture excerpt reviewed/g) || []).length;
  ok(notes >= 1 && notes <= shown, `the note rides only on the reviewed item's lines (${notes} note(s), ${shown} line(s))`);
  ok(!(win.SPOTLIGHT_DATA[PID] || []).some((e) => e.source && e.source.url === HIDDEN.link), "hidden: never folded into SPOTLIGHT_DATA");

  // Fails closed: a hidden entry handed straight to the profile is dropped too.
  const win2 = boot();
  const direct = toSpotlightEntry(HIDDEN, { review: { status: "hidden" } });
  const r2 = win2.PDXProfileLocker.onBody({ items: { [PID]: [direct] }, count: 1 });
  ok(r2 && r2.added === 0, "a hidden entry passed directly is not ingested");
  ok(!views(win2).includes("Review fixture excerpt hidden"), "…and is not printed");
  ok(win2.PDXProfileLocker.reviewOf(toSpotlightEntry(PLAIN)) === "", "an unflagged entry has no review status");
} catch (e) {
  failures.push(`the sandboxed profile failed to boot or render — ${e && e.stack || e}`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} failing (of ${failures.length + passed}):`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ person locker review: ${passed} assertions pass`);
