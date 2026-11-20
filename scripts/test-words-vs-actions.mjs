#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-words-vs-actions.mjs — the automatic words-vs-actions note in the drawer
// ─────────────────────────────────────────────────────────────────────────────
// Over the pairs "Where this conflicts" walks, one short note per pair where the
// reader holds a side on an issue, the person STATES that side, and a vote of
// theirs on it cut the other way. Pins:
//   1. a stated side + a conflicting curated vote → the note, naming the vote,
//      the date, the reader's side and the official record
//   2. votes that agree with the stated side (and the reader) → no note, and the
//      drawer is byte-identical to one where the note cannot fire
//   3. no saved stance / a reader on the other side / a mixed side → no note
//   4. a publishable raw roll call on the same roll is preferred (its vote, its
//      record); a raw Yea/Nay that differs is read through the curated mapping;
//      present / not voting drops the act
//   5. a bill that fails the publish gate gives no raw-feed note (the real gate)
//   6. one note per pair, every pair in the map, no score words, the rest of the
//      drawer untouched
//
//   node scripts/test-words-vs-actions.mjs   (no database, no network)

import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "wva-"));
const outP = join(dir, "pub.mjs");
await esbuild.build({ entryPoints: [join(ROOT, "netlify/lib/vote-actions-publish.ts")], bundle: true, platform: "node", format: "esm", outfile: outP, logLevel: "silent" });
const P = await import(pathToFileURL(outP).href);

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js", "stance-helpers.js",
  "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js", "related-issues.js"];
const corpus = buildCorpus(ROOT);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
  return win;
}
const withSides = (win, sides) => { win.PDXStanceSides = { list: () => Object.entries(sides).map(([key, position]) => ({ key, position, priority: "medium" })) }; return win; };
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const WVA = (h) => (/<div class="pdxri-wva"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const items = (h) => [...WVA(h).matchAll(/<li class="pdxri-wva-item"[^>]*>[\s\S]*?<\/li>/g)].map((m) => m[0]);

const win = boot();
const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
const statedOf = (pid, k) => { const e = (win._polPositionMap(pid, win.CMP_DATA[pid]) || {})[k]; const s = String(e && e.stance || ""); return /^(support|oppose)$/.test(s) ? s : null; };
const against = (s) => (s === "support" ? "opposes" : "advances");
// The drawer with the note forced off: what the drawer looked like before this pass.
function withoutNote(w, fn) { const keep = w.PDXConsistency.wordsVsActionsActs; w.PDXConsistency.wordsVsActionsActs = () => []; try { return fn(); } finally { w.PDXConsistency.wordsVsActionsActs = keep; } }

// ── fixtures from the real record ────────────────────────────────────────────
let clash = null, calm = null;
for (const pid of Object.keys(win.CMP_DATA)) {
  const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
  for (const k of Object.keys(pm)) {
    const s = statedOf(pid, k);
    if (!s || !RI.MAP[k] || !RI.MAP[k].length) continue;
    const acts = CS.wordsVsActionsActs(pid, k);
    if (!acts.length) continue;
    const bad = acts.filter((a) => a.dir === against(s));
    // The open issue: a related key the person has a line on, so the pair exists.
    const open = RI.MAP[k].find((o) => (RI.itemsFor(pid, win.CMP_DATA[pid], o) || []).some((it) => it.key === k));
    if (!open) continue;
    if (bad.length && !clash) clash = { pid, k, s, open, bad, acts };
    if (!bad.length && !calm) calm = { pid, k, s, open, acts };
  }
  if (clash && calm) break;
}
ok(!!clash && !!calm, `fixtures found (clash ${clash && `${clash.pid}/${clash.k}`}, calm ${calm && `${calm.pid}/${calm.k}`})`);
const OTHER = { support: "oppose", oppose: "support" };

// ── 1 · a stated side and a vote that cut against it ─────────────────────────
withSides(win, { [clash.k]: clash.s });
let h = CS.gapViewHtml(clash.pid, clash.open) || "";
let notes = items(h);
const mine = notes.filter((n) => n.includes(`data-pdxri-wva-key="${clash.k}"`));
eq(mine.length, 1, `${clash.pid} on ${clash.open}: one note for ${clash.k}`);
const latest = clash.bad.slice().sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
const lbl = (k) => RI.itemsFor(clash.pid, win.CMP_DATA[clash.pid], clash.open).find((it) => it.key === k)?.label;
const said = clash.s === "support" ? "they state they support it" : "they state they oppose it";
ok(text(mine[0]).includes(`on ${lbl(clash.k)} ${said}, but voted ${latest.word} on ${latest.ident} (${String(latest.date).slice(0, 10)})`) &&
  text(mine[0]).includes(`which ran against it; you ${clash.s}.`), `note names the stated side, the vote, the date and the reader — ${text(mine[0])}`);
ok(mine[0].includes('data-pdxri-wva-from="curated"') && mine[0].includes(`href="${latest.url}"`) && /official record<\/a>/.test(mine[0]), "curated vote: its official record is linked");
ok(text(WVA(h)).startsWith("Words and votes"), "the block is headed Words and votes");
const cfAt = h.indexOf('class="pdxri-conflicts"'), wvaAt = h.indexOf('class="pdxri-wva"'), recAt = h.indexOf('data-pdxgap-sec="record"');
ok(wvaAt > 0 && (cfAt < 0 || wvaAt > cfAt) && wvaAt > recAt, "the note sits after the formal record and after Where this conflicts");
eq(h.replace(WVA(h), ""), withoutNote(win, () => CS.gapViewHtml(clash.pid, clash.open) || ""), "with the note removed the drawer is byte-identical");

// ── 2/3 · no conflict → no note, drawer as today ─────────────────────────────
withSides(win, { [calm.k]: calm.s });
h = CS.gapViewHtml(calm.pid, calm.open) || "";
ok(!/pdxri-wva/.test(h), `${calm.pid}/${calm.k}: votes that agree with the stated side → no note`);
eq(h, withoutNote(win, () => CS.gapViewHtml(calm.pid, calm.open) || ""), "agreeing votes: drawer byte-identical");
withSides(win, { [clash.k]: OTHER[clash.s] });
ok(!/pdxri-wva/.test(CS.gapViewHtml(clash.pid, clash.open) || ""), "reader on the other side from the stated one → no note (that is Where this conflicts' job)");
withSides(win, { [clash.k]: "mixed" });
ok(!/pdxri-wva/.test(CS.gapViewHtml(clash.pid, clash.open) || ""), "a mixed side is not a side → no note");
withSides(win, {});
ok(!/pdxri-wva/.test(CS.gapViewHtml(clash.pid, clash.open) || ""), "no saved stances → no note");
delete win.PDXStanceSides;
eq(CS.gapViewHtml(clash.pid, clash.open) || "", withoutNote(win, () => CS.gapViewHtml(clash.pid, clash.open) || ""), "no stance reader on the page → drawer byte-identical");
eq(RI.wordsVsActionsHtml(clash.pid, win.CMP_DATA[clash.pid], "no_such_issue_key"), "", "an issue outside the map → nothing");

// ── 4 · the raw roll call is preferred; its vote is read through the mapping ─
const tally = CS.dossierTally(clash.pid, clash.k);
const curRow = tally.rows.find((p) => p.dir === against(clash.s) && p.d.item && /^(yea|nay)$/i.test(p.d.item.position) && CS.voteActionBillKey(p.d));
ok(!!curRow, "fixture: a conflicting curated roll call with a bill key");
const it = curRow.d.item, bk = CS.voteActionBillKey(curRow.d);
const rawRoll = (vote) => ({ chamber: it.chamber, congress: +it.congress, session: +it.session, roll: +it.rollNumber, date: "2026-11-01T00:00:00.000Z",
  vote, voteRaw: vote === "yes" ? "Aye" : vote === "no" ? "No" : "Not Voting", voteKind: "passage", procedural: false,
  sourceUrl: "https://clerk.house.gov/evs/raw/roll.xml" });
const same = String(it.position).toLowerCase() === "yea" ? "yes" : "no";
const flip = same === "yes" ? "no" : "yes";
const w4 = withSides(boot(), { [clash.k]: clash.s });
const C4 = w4.PDXConsistency;
const only = (acts) => acts.filter((a) => a.ident === curRow.d.ident && String(a.date).slice(0, 10) === "2026-11-01");
C4.setVoteActionLinks(clash.pid, { [bk]: [rawRoll(same)] }, { mode: "public" });
let a4 = only(C4.wordsVsActionsActs(clash.pid, clash.k));
const rawWord = rawRoll(same).voteRaw;
eq(a4.map((a) => [a.from, a.dir, a.word, a.url]), [["raw", curRow.dir, rawWord, "https://clerk.house.gov/evs/raw/roll.xml"]], "same roll in the raw feed → the raw vote and its record, the curated side");
h = C4.gapViewHtml(clash.pid, clash.open) || "";
ok(items(h).some((n) => n.includes('data-pdxri-wva-from="raw"') && n.includes('href="https://clerk.house.gov/evs/raw/roll.xml"') && text(n).includes(`but voted ${rawWord}`)), "the note prefers the publishable raw vote");
C4.setVoteActionLinks(clash.pid, { [bk]: [rawRoll(flip)] }, { mode: "public" });
a4 = only(C4.wordsVsActionsActs(clash.pid, clash.k));
eq(a4.map((a) => [a.from, a.dir]), [["raw", curRow.dir === "advances" ? "opposes" : "advances"]], "the other of Yea/Nay in the raw feed → the other side, through the curated mapping");
C4.setVoteActionLinks(clash.pid, { [bk]: [rawRoll("not_voting")] }, { mode: "public" });
ok(!C4.wordsVsActionsActs(clash.pid, clash.k).some((a) => a.ident === curRow.d.ident && a.from === "raw") &&
  C4.wordsVsActionsActs(clash.pid, clash.k).length === CS.wordsVsActionsActs(clash.pid, clash.k).length - 1, "not voting in the raw feed → that act has no side and is dropped");
C4.setVoteActionLinks(clash.pid, { [bk]: [{ ...rawRoll(same), roll: +it.rollNumber + 9999 }] }, { mode: "public" });
ok(!C4.wordsVsActionsActs(clash.pid, clash.k).some((a) => a.from === "raw"), "a raw roll on the same bill but another roll call is not used");
C4.setVoteActionLinks(clash.pid, { [bk]: [rawRoll(same)] }, { mode: "curator", publish: { [bk]: { billKey: bk, publishable: false, failed: ["has_topic_tag"] } } });
ok(!C4.wordsVsActionsActs(clash.pid, clash.k).some((a) => a.from === "raw"), "curator session: a held bill's raw rows are never used for the note");

// ── 5 · the real gate: a failing bill gives no raw-feed note ─────────────────
// The calm fixture's curated acts all agree. A raw roll call on one of them,
// flipped, WOULD make the note — but only if the bill passes the gate.
const ct = CS.dossierTally(calm.pid, calm.k);
const calmRow = ct.rows.find((p) => p.dir && p.dir !== "none" && p.d.item && /^(yea|nay)$/i.test(p.d.item.position) && CS.voteActionBillKey(p.d) && !p.d.execAct);
ok(!!calmRow, "fixture: an agreeing curated roll call with a bill key");
const ci = calmRow.d.item, cbk = CS.voteActionBillKey(calmRow.d);
const flipped = String(ci.position).toLowerCase() === "yea" ? "no" : "yes";
const rawRow = { billKey: cbk, chamber: ci.chamber, congress: +ci.congress, session: +ci.session, rollNumber: +ci.rollNumber, voteDate: "2026-11-02T00:00:00.000Z",
  vote: flipped, voteRaw: flipped === "yes" ? "Yea" : "Nay", voteKind: "passage", isProcedural: false, question: "On Passage", sourceUrl: "https://clerk.house.gov/evs/raw/calm.xml", sourceLabel: "Clerk", rawRef: "house/x.json" };
const goodStats = { billKey: cbk, measureType: "bill", tagCount: 1, rows: 430, unmappedRows: 0, unknownKindRows: 0, missingRawRows: 0, proceduralRows: 0, rolls: 1 };
async function viaGate(stats) {
  const w = withSides(boot(), { [calm.k]: calm.s });
  const d = { rowsForPolitician: async () => [rawRow], statsForBills: async () => [stats] };
  w.fetch = async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(await P.publishedForPolitician(calm.pid, d))) });
  w.PDXAuth = { state: "out", user: null };
  await w.PDXConsistency.loadVoteActionLinks(calm.pid, () => {});
  await new Promise((r) => setTimeout(r, 10));
  return w.PDXConsistency.gapViewHtml(calm.pid, calm.open) || "";
}
const passHtml = await viaGate(goodStats);
ok(items(passHtml).some((n) => n.includes('data-pdxri-wva-from="raw"') && n.includes(`data-pdxri-wva-key="${calm.k}"`) && n.includes("https://clerk.house.gov/evs/raw/calm.xml")), "a publishable raw vote that cuts against the stated side → the note, from the raw feed");
for (const [rule, patch] of [["has_topic_tag", { tagCount: 0 }], ["members_mapped", { unmappedRows: 1 }], ["raw_payload_stored", { missingRawRows: 2 }], ["vote_kind_known", { unknownKindRows: 1 }]]) {
  const held = await viaGate({ ...goodStats, ...patch });
  ok(!/pdxri-wva/.test(held), `bill held by ${rule} → no note from the raw feed`);
}

// ── 6 · pairs, wording, the rest of the drawer ───────────────────────────────
withSides(win, { [clash.k]: clash.s });
let all = 0, perPair = 0;
for (const o of RI.MAP[clash.k]) {
  const hh = CS.gapViewHtml(clash.pid, o) || "";
  const ns = items(hh);
  all += ns.length;
  const pairs = ns.map((n) => /data-pdxri-wva-pair="([^"]+)"/.exec(n)[1]);
  ok(pairs.every((p) => RI.MAP[o].includes(p)), `${o}: every note's pair is in the map`);
  ok(new Set(pairs).size === pairs.length, `${o}: one note per pair`);
  if (ns.length) perPair++;
  const t = text(WVA(hh));
  ok(!/score|grade|confiden|%|propaganda|lie|liar|hypocri|flip-?flop/i.test(t), `${o}: no score or verdict words — ${t}`);
}
ok(all > 0 && perPair > 0, "notes appear across the related drawers");
// Only the open issue clashes → printed once, not on every pair.
const w6 = withSides(boot(), { [clash.k]: clash.s });
const openOnly = (w6.PDXRelatedIssues.wordsVsActionsFor(clash.pid, w6.CMP_DATA[clash.pid], clash.k) || []).filter((n) => n.side.key === clash.k);
ok(openOnly.length <= 1, "a clash on the open issue is printed at most once");
// Existing sections and scoring untouched.
ok(!/pdxri-wva/.test(R("politician-stances.js") + R("word-action.js")), "no stance store or scoring file reads the note");
const cfOnly = (x) => (/<div class="pdxri-conflicts"[\s\S]*?<\/(?:ul|p)><\/div>/.exec(x) || [""])[0];
const hh = CS.gapViewHtml(clash.pid, clash.open) || "";
eq(cfOnly(hh), cfOnly(withoutNote(win, () => CS.gapViewHtml(clash.pid, clash.open) || "")), "Where this conflicts is unchanged");
ok(!/<a\b/.test(cfOnly(hh)), "Where this conflicts still carries no link");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ words vs actions: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ words vs actions: ${passed} checks passed`);
