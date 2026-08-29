#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-pack-no-downgrade.mjs — the offline snapshot may not outrank the DB
// ─────────────────────────────────────────────────────────────────────────────
// Live on politidex.fyi, one deploy after the primary-lede merge, `/p/curtis ·
// housing` printed two answers at once: the stance tree said "Thin supports · 1
// vote · 1 measure", and the dossier's Official Record said "Not about this
// issue" and told the reader H.R. 6644 had "brushed the subject". `/p/lee ·
// housing` — the same measure, the same PRIMARY mapping, the opposite ballot —
// read "Thin opposes" on both surfaces. It looked like a side asymmetry.
//
// It is not one. Nothing in _recordDirectionIndex, _recordDisplayTier or
// _fpiUnreadWhy is keyed on which way a member voted, and section 1 below proves
// it by feeding both members the same two snapshots: on one they BOTH read, on
// the other they BOTH refuse.
//
// The asymmetry was in the DATA, one field wide. /api/voting-record has two
// mouths:
//
//   /member/:id        live DB query — H.R. 6644 | housing, weight 80, isPrimary
//                      true (federal wave F4 promoted it)
//   /member/:id/pack   Netlify Blobs snapshot on a six-hour TTL, rebuilt lazily
//                      on read — still carrying the pre-F4 row, isPrimary false
//
// and one cache, PDXVotingRecord._records, which noteMember replaces wholesale.
// fetchPack's .then called noteMember unconditionally, so the fire-and-forget
// pack warm-up in _pdxInitVotingRecord — fired to seed the service worker, not
// the cache — landed on top of the live read the profile had just painted from.
// isPrimary is not a cosmetic field. It says whether a mapped act was a vote ON
// the issue or a vote on something larger that carried the issue, and both lanes
// that read the record spend it: _recordPatternTier will not characterise a row
// without one, and _recordDisplayTier — since the August 2026 package-borne
// relaxation — will still publish the side without one but caps it at thin, marks
// it packageOnly and makes it say how the vote arrived. On the reported deploy the
// display lane had no such branch and returned null outright below
// _RD_MIN_PRIMARY, so dropping that one boolean was the whole distance between
// "Thin supports" and "Not about this issue". Today it is a narrower distance and
// still a real one, which is what section 1 now pins. Surfaces painted before the
// clobber kept the true read; the dossier sheet, which is computed when the reader
// clicks, recomputed from the downgraded cache. Which member showed it was decided
// by which response won a race — hence one of two identical rows.
//
// WHAT MUST STILL BE TRUE, and is what this file holds:
//
//   1. THE DOWNGRADE IS A DOWNGRADE, NOT A SIDE. Same items, flag on: both
//      members read a characterised thin. Flag off: both members read a
//      package-borne thin — identically, same tier, same label, same side, now
//      carrying the arrival disclosure and no longer characterised at all.
//   2. THE PACK IS NOT A WRITER. A live read owns the member's row in _records
//      from the moment it is REQUESTED, and a pack arriving before, during or
//      after it cannot seed over the answer — in either arrival order.
//   3. THE PACK IS STILL THE FALLBACK. Cold, with nothing warm and no live read,
//      it seeds. Offline, it still resolves as the payload the section renders
//      and is still seeded explicitly by the caller that asked for it.
//   4. THE INVARIANT THE REPORT ASKED FOR, over the whole corpus: a row whose
//      published display tier is thin — on EITHER side — never reaches an
//      `incidental` refusal, and vice versa; the refusal and the read are two
//      answers to one question and no row may hold both. Plus the ceiling the
//      relaxation was granted under: every display-lane read standing on
//      primary=0 is thin, is uniform, discloses that its acts reached the issue
//      inside measures that were mainly about something else, and never reaches
//      mostly or strong.
//
//   node scripts/test-record-pack-no-downgrade.mjs
//
// Real shipped modules in a node:vm sandbox, over the shipped record corpus,
// with fetch stubbed to hand back the two payloads in an order this file picks.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" is still printed`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ ${msg}\n`); process.exit(1); } };

// The offline cases below deliberately fail a request, and fetchMember warns on the
// way past. Muting the sandbox's console keeps a deliberate 503 from reading like a
// broken test in this file's output; nothing here asserts on it.
const mute = (win) => { win.console = { log() {}, warn() {}, error() {} }; return win; };

const boot = () => {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  // makeSandbox is a BUILD-time sandbox and deliberately has no network: its fetch
  // rejects and it carries none of fetch's neighbours. This file exercises the
  // request path itself, so the two globals that path touches are supplied here
  // rather than widened in the shared sandbox, where nothing else wants them.
  // AbortController is left out on purpose — fetchMember checks for it and falls
  // back to an un-abortable request, which is the branch a stub can answer.
  win.URLSearchParams = URLSearchParams;
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
};

const NOT_ABOUT = "Not about this issue";
const BRUSHED = "brushed the subject";
// The arrival disclosure a package-borne read must carry. Three surfaces word it
// three ways — the pattern-engine note declines for one vote and for several, and
// the scored slot has a sentence of its own that states no tier — so the clause all
// three share is what is matched here, and none of them can be dropped without this
// file noticing. The word "package" is deliberately NOT matched: only the vehicle
// detector has the evidence to use it, and this sentence claims only what a missing
// PRIMARY flag proves.
const PACKAGE = "mainly about something else";
const pkgLine = (s) => /mainly about something else/.test(String(s || ""));
const MEASURE = "H.R. 6644";
const KEY = "housing";
// The report's two rows, and the label each must carry on BOTH surfaces. F4 left
// supportMeaning at yea_supports, so one vote on one bill reads opposite ways for
// a yea and a nay — which is the whole reason these two are the pair to pin.
const PAIR = [["curtis", "Thin supports", "support"], ["lee", "Thin opposes", "oppose"]];

const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);

// ── the two payloads, differing by exactly one field ─────────────────────────
// The live pack really is this: a full diff of /member/curtis against
// /member/curtis/pack on the reported deploy returned 70 identical items and one
// mismatch, `H.R. 6644|housing fresh true pack false`. So the stale snapshot is
// modelled by flipping that flag and nothing else — anything wider would be
// testing a fixture instead of the bug.
const fresh = (pid) => JSON.parse(JSON.stringify(byMember.get(pid) || []));
const stale = (pid) => {
  const items = fresh(pid);
  let flipped = 0;
  for (const it of items) {
    if (String(it.number || "").trim() !== MEASURE) continue;
    for (const m of (it.issues || [])) {
      if (m && m.issueKey === KEY && m.isPrimary) { m.isPrimary = false; flipped++; }
    }
  }
  must(flipped === 1, `${pid}: the fixture flipped ${flipped} mappings, expected exactly 1`);
  return items;
};
const payload = (items) => ({
  items, generatedAt: "2026-08-29T02:24:59.038Z",
  summary: { totalRecords: items.length },
});
const primaryFlag = (win, pid) => {
  const recs = win.PDXVotingRecord.memberRecords(pid) || [];
  for (const it of recs) {
    if (String(it.number || "").trim() !== MEASURE) continue;
    for (const m of (it.issues || [])) if (m && m.issueKey === KEY) return !!m.isPrimary;
  }
  return null;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the downgrade is a downgrade, not a side");
// ═════════════════════════════════════════════════════════════════════════════
// The claim in the report is that one side reads and the other refuses. Fed the
// same snapshot, the two members do the same thing as each other — twice, once
// per snapshot. What differs is the snapshot, and it differs for both of them.
for (const [snapshot, items] of [["live (F4)", fresh], ["stale pack", stale]]) {
  const win = boot();
  for (const [pid] of PAIR) win.PDXVotingRecord.noteMember(pid, items(pid));
  const CS = win.PDXConsistency;
  const seen = [];
  for (const [pid, want, side] of PAIR) {
    const row = (CS.issueRows(pid) || []).find((r) => r && r.key === KEY);
    ok(!!row, `${snapshot}/${pid}: no ${KEY} row on the profile at all`);
    if (!row) continue;
    const tree = CS.recordPattern.display(row) || null;
    const d = CS.dossierRead(pid, KEY);
    const idx = win._pdxRecordDirection(pid, KEY) || null;
    const html = CS.gapViewHtml(pid, KEY) || "";
    const why = (d.why && d.why.id) || "";
    seen.push(`${d.state}/${why}`);

    if (snapshot === "live (F4)") {
      eq(idx && idx.primary, 1, `${snapshot}/${pid}: one primary-mapped act on file`);
      eq(tree && tree.label, want, `${snapshot}/${pid}: the tree's Record slot`);
      eq(tree && tree.tone, side, `${snapshot}/${pid}: the tree's side`);
      eq(d.state, "reads", `${snapshot}/${pid}: the dossier reads the record`);
      eq(d.label, want, `${snapshot}/${pid}: the dossier's label is the tree's label`);
      // The half of the contrast the stale branch below is measured against: with
      // the promotion on file this is the member's own vote on the issue, so the
      // pattern engine characterises it and there is no arrival to disclose.
      eq(tree && tree.display, false, `${snapshot}/${pid}: the pattern engine owns the read`);
      eq(tree && tree.packageOnly, false, `${snapshot}/${pid}: nothing arrived in a package`);
      ok(!(tree && tree.packageNote), `${snapshot}/${pid}: so there is no arrival sentence`);
      no(tree && tree.note, PACKAGE, `${snapshot}/${pid}: and none in the note either`);
      has(html, MEASURE, `${snapshot}/${pid}: the sheet names the measure`);
      no(html, NOT_ABOUT, `${snapshot}/${pid}: the sheet does not refuse the row`);
      no(html, BRUSHED, `${snapshot}/${pid}: the sheet does not call the measure a brush`);
    } else {
      // THE DOWNGRADE, IN ITS CURRENT SHAPE. The reported symptom itself is gone:
      // the row no longer blanks, because a uniform run of judged acts may now
      // state its side whether or not a PRIMARY mapping survived. What the stale
      // snapshot still costs is the CLAIM, not the side. With the promotion the
      // vote is Curtis's vote on housing and the pattern engine characterises it;
      // without it the same vote is one that reached housing inside H.R. 6644, so
      // the read drops to the browse-only lane, has to say how it arrived, and can
      // never be more than thin however much else lands on the row later.
      //
      // Both members still do the same thing as each other, which is the claim
      // this section exists to settle. The pack is still not allowed to do this —
      // section 2 is what stops it — and a reader who met this row would still be
      // told less than the record holds.
      eq(idx && idx.primary, 0, `${snapshot}/${pid}: the promotion is gone from the snapshot`);
      eq(tree && tree.tier, "thin", `${snapshot}/${pid}: the tree still states the side, thinly`);
      eq(tree && tree.label, want, `${snapshot}/${pid}: with the live read's own label`);
      eq(tree && tree.tone, side, `${snapshot}/${pid}: and the live read's own side`);
      // …and here is the cost, in the two fields that carry it.
      eq(tree && tree.display, true, `${snapshot}/${pid}: but published by the browse lane, not the pattern engine`);
      eq(tree && tree.packageOnly, true, `${snapshot}/${pid}: and flagged as package-borne`);
      has(tree && tree.note, PACKAGE, `${snapshot}/${pid}: with the arrival disclosed in the slot's own note`);
      const pt = CS.recordPattern.tier(row);
      ok(!pt || pt.tier === "none", `${snapshot}/${pid}: the pattern engine characterises nothing here`);
      // The dossier follows the tree, as it did before — the two surfaces were
      // never in disagreement about ONE set of items; they were rendered from two.
      eq(d.state, "reads", `${snapshot}/${pid}: the dossier reads the row too`);
      eq(d.tier, "thin", `${snapshot}/${pid}: at the same tier`);
      eq(why, "", `${snapshot}/${pid}: so there is no refusal reason to print`);
      has(html, PACKAGE, `${snapshot}/${pid}: the sheet carries the arrival sentence`);
      no(html, NOT_ABOUT, `${snapshot}/${pid}: and no longer prints the reported refusal`);
      no(html, BRUSHED, `${snapshot}/${pid}: nor the brush clause`);
    }
  }
  eq(seen[0], seen[1], `${snapshot}: both sides land in the same state (${seen.join(" vs ")})`);
  console.log(`      ${snapshot}: curtis and lee both → ${seen[0]}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the pack is not a writer");
// ═════════════════════════════════════════════════════════════════════════════
// Both arrival orders, through the REAL fetchMember/fetchPack, with the network
// stubbed so this file decides who answers first. Order A is production's:
// _pdxInitVotingRecord fires the pack warm-up and then the live read in the same
// task, and the pack — smaller, blob-served, often already in the SW cache —
// comes back first.
const stub = (win) => {
  const gate = new Map();
  win.fetch = (url) => {
    const pid = String(url).match(/\/member\/([^/?]+)/)[1];
    const isPack = String(url).indexOf("/pack") >= 0;
    const k = `${pid}|${isPack ? "pack" : "live"}`;
    let box = gate.get(k);
    if (!box) { box = {}; box.p = new Promise((res) => { box.res = res; }); gate.set(k, box); }
    return box.p;
  };
  return {
    // A resolved Response, or a refused one for the offline cases.
    deliver: (pid, which, body) => {
      const box = gate.get(`${pid}|${which}`);
      must(!!box, `nothing ever requested ${pid}/${which}`);
      box.res(body === null
        ? { ok: false, status: 503, json: () => Promise.reject(new Error("offline")) }
        : { ok: true, status: 200, json: () => Promise.resolve(body) });
    },
    asked: (pid, which) => gate.has(`${pid}|${which}`),
  };
};

for (const order of ["pack first", "live first"]) {
  const win = boot();
  const net = stub(win);
  const VR = win.PDXVotingRecord;
  const CS = win.PDXConsistency;

  for (const [pid] of PAIR) {
    const packP = VR.fetchPack(pid);                       // fire-and-forget SW warm
    const liveP = VR.fetchMember(pid, { pageSize: 100 });  // the answer
    ok(net.asked(pid, "pack") && net.asked(pid, "live"), `${order}/${pid}: both mouths were asked`);
    // The claim is staked at request time, before any byte comes back — which is
    // the only way a guard can win a race it does not control.
    eq(VR._packMaySeed(pid), false, `${order}/${pid}: a live read in flight already owns the row`);

    if (order === "pack first") {
      net.deliver(pid, "pack", payload(stale(pid)));
      await packP;
      eq(VR.memberRecords(pid), null, `${order}/${pid}: the snapshot did not seed over a pending read`);
      net.deliver(pid, "live", payload(fresh(pid)));
      await liveP.then((d) => VR.noteMember(pid, d.items));
    } else {
      net.deliver(pid, "live", payload(fresh(pid)));
      await liveP.then((d) => VR.noteMember(pid, d.items));
      eq(primaryFlag(win, pid), true, `${order}/${pid}: the live read seeded the promotion`);
      net.deliver(pid, "pack", payload(stale(pid)));
      await packP;
    }
    eq(primaryFlag(win, pid), true, `${order}/${pid}: the promotion survived the pack`);
  }

  // …and the acceptance, read off the surfaces the reader actually meets.
  for (const [pid, want, side] of PAIR) {
    const row = (CS.issueRows(pid) || []).find((r) => r && r.key === KEY);
    const tree = row ? (CS.recordPattern.display(row) || null) : null;
    const d = CS.dossierRead(pid, KEY);
    const html = CS.gapViewHtml(pid, KEY) || "";
    eq(tree && tree.label, want, `${order}/${pid}: the tree's Record slot`);
    eq(tree && tree.tone, side, `${order}/${pid}: the tree's side`);
    eq(d.state, "reads", `${order}/${pid}: the Official Record reads the record`);
    eq(d.tier, "thin", `${order}/${pid}: the Official Record's tier`);
    eq(d.label, want, `${order}/${pid}: the Official Record's label`);
    ok(!d.why, `${order}/${pid}: a row that reads carries no refusal reason`);
    has(html, MEASURE, `${order}/${pid}: the sheet names the measure`);
    no(html, NOT_ABOUT, `${order}/${pid}: the sheet does not refuse the row`);
    no(html, BRUSHED, `${order}/${pid}: the sheet does not call the measure a brush`);
  }
  console.log(`      ${order}: curtis Thin supports · lee Thin opposes, on both surfaces`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the pack is still the fallback");
// ═════════════════════════════════════════════════════════════════════════════
// A guard that quietly broke offline would be the same defect facing the other
// way: the pack exists so a member the reader has opened before still renders
// with no network. Three things it must keep doing.
{
  // (a) COLD AND ALONE. Nothing warm, no live read asked for — the pack seeds.
  const win = boot();
  const net = stub(win);
  const VR = win.PDXVotingRecord;
  eq(VR._packMaySeed("curtis"), true, "cold: with no live read claimed, the pack may seed");
  const p = VR.fetchPack("curtis");
  net.deliver("curtis", "pack", payload(stale("curtis")));
  await p;
  ok(!!VR.memberRecords("curtis"), "cold: the pack seeded the record with nothing to protect");
  eq((VR.memberRecords("curtis") || []).length, fresh("curtis").length,
    "cold: the whole record came through, not a slice of it");

  // (b) OFFLINE. The live endpoint fails; the pack still RESOLVES as the payload
  //     _pdxInitVotingRecord renders, and that caller seeds it explicitly — the
  //     noteMember at the end of the section's .then, which no guard sits in
  //     front of. Modelled here exactly as that function does it.
  const w2 = mute(boot());
  const n2 = stub(w2);
  const V2 = w2.PDXVotingRecord;
  const packP = V2.fetchPack("lee");
  // The chain is BUILT before either response is delivered, because that is the
  // shape of the thing being tested: both requests are in flight together and the
  // fallback is chosen by which one came back with something.
  const chain = V2.fetchMember("lee", { pageSize: 100 })
    .then((d) => d || packP);          // fetchMember resolves null on failure
  n2.deliver("lee", "live", null);     // 503
  n2.deliver("lee", "pack", payload(stale("lee")));
  const resolved = await chain;
  ok(!!resolved && Array.isArray(resolved.items), "offline: the fallback still hands back a payload");
  eq(resolved.summary.totalRecords, fresh("lee").length, "offline: with the member's whole record in it");
  V2.noteMember("lee", resolved.items.slice());
  ok(!!V2.memberRecords("lee"), "offline: the caller's own seed is not gated");
  eq(primaryFlag(w2, "lee"), false, "offline: and it is honestly the snapshot, not a forgery");

  // (c) clearCache drops the claims with the answers, or a pack could never seed
  //     an offline open again for the rest of the session.
  const w3 = mute(boot());
  const n3 = stub(w3);
  const V3 = w3.PDXVotingRecord;
  const dead = V3.fetchMember("curtis", { pageSize: 100 });
  eq(V3._packMaySeed("curtis"), false, "clearCache: claimed before");
  V3.clearCache();
  eq(V3._packMaySeed("curtis"), true, "clearCache: released after");
  n3.deliver("curtis", "live", null);
  eq(await dead, null, "clearCache: and the dropped request still resolves quietly");
  console.log("      cold seed · offline fallback · claim release, all intact");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · read and refusal stay exclusive · the package-borne ceiling holds");
// ═════════════════════════════════════════════════════════════════════════════
// The invariant the report asked to be made explicit, swept over the whole
// corpus. It used to hold on a floor: _recordDisplayTier returned null below
// _RD_MIN_PRIMARY and _fpiUnreadWhy's incidental branch was only entered below 1,
// so no single index could satisfy both. The August 2026 relaxation turned that
// floor into a ceiling — a uniform run of package-borne acts now publishes a thin
// side instead of nothing — and the exclusion survives it for a different reason:
// the refusal ladder is only ever consulted where nothing was read, so a row that
// published anything never reaches it at all.
//
// What replaces the floor here is the ceiling the relaxation was granted under,
// asserted on real rows on both sides: a display-lane read standing on primary=0
// is thin, is uniform, discloses how its acts arrived, and never reaches mostly or
// strong. A future edit that lets riders characterise a row fails here rather than
// on a profile.
{
  const win = boot();
  for (const [pid, recs] of byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch (e) {}
  }
  const CS = win.PDXConsistency;
  const bad = [], floorBreak = [];
  let rows = 0, thinSupport = 0, thinOppose = 0, incid = 0, pkgBorne = 0;
  let viaPattern = 0, viaDisplay = 0, viaDisplayAny = 0;
  for (const pid of byMember.keys()) {
    const fpi = Object.create(null);
    try { (CS.formalPatternIndex.rows(pid) || []).forEach((x) => { if (x && x.key) fpi[x.key] = x; }); }
    catch (e) {}
    for (const r of (CS.issueRows(pid) || [])) {
      if (!r || !r.key) continue;
      let d, tree, idx;
      try { d = CS.dossierRead(pid, r.key); } catch (e) { continue; }
      if (!d || d.state === "cold" || d.state === "pending") continue;
      try { tree = CS.recordPattern.display(r) || null; } catch (e) { tree = null; }
      try { idx = win._pdxRecordDirection(pid, r.key) || null; } catch (e) { idx = null; }
      rows++;
      const why = (d.why && d.why.id) || "";
      const published = !!(tree && tree.tier && tree.tier !== "none");
      // The executive lane reads a different index (_stExecDisplayIndex), which has
      // no roll-call primary flag to count, so the floor cross-check below is asked
      // only of the vote lane the report is about. The contradiction checks are
      // lane-agnostic and stay that way.
      const voteLane = r.lane !== "exec";
      if (published && tree.tier === "thin" && tree.directional) {
        if (tree.tone === "support") thinSupport++; else if (tree.tone === "oppose") thinOppose++;
        // The report's exact sentence: display.tier thin, display.side support.
        if (why === "incidental") bad.push(`${pid}/${r.key} (${tree.tone})`);
        if (d.state !== "reads") bad.push(`${pid}/${r.key}: published ${tree.label}, dossier ${d.state}`);
        // WHY it cannot be otherwise, and there are two answers because a published
        // thin read reaches the slot down two different paths:
        //
        //   display: false — _recordDisplayTier handed back _recordPatternTier's own
        //     read, untouched, on its first line. The pattern engine's thin tier is
        //     gated on _RD_THIN_MIN judged acts, not on a primary flag, so
        //     idx.primary may well be 0 here. It cannot reach the refusal anyway:
        //     _dosFormalRead asks _stPatternTier FIRST, and a row the pattern engine
        //     characterises is answered before the ladder gets to _fpiUnreadWhy.
        //   display: true — the browse-only lane, past the pattern engine's decline.
        //     That path runs the primary floor at _RD_MIN_PRIMARY, and _fpiUnreadWhy's
        //     incidental branch is only entered below 1. No one index can be on both
        //     sides of that line, which is the guarantee the report asked for.
        if (tree.display === true) viaDisplay++;
        else {
          viaPattern++;
          const x = fpi[r.key];
          if (voteLane && !(x && x.read)) {
            floorBreak.push(`${pid}/${r.key}: pattern-tier thin the index does not read`);
          }
        }
      }
      // The display lane's own gate, asked of every row that reached the slot
      // through it, at any tier — in this corpus that population is the `split`
      // rows _dosPublishedRead was added for. Below _RD_MIN_PRIMARY the lane
      // returns null, so no row can be here and inside the refusal at once.
      if (published && tree.display === true) {
        viaDisplayAny++;
        if (voteLane && idx && (idx.primary || 0) < 1) {
          // THE CEILING, ROW BY ROW. Everything this lane may say about a record it
          // only ever met inside larger measures, and nothing it may not.
          pkgBorne++;
          const adv = idx.advances || 0, opp = idx.opposes || 0;
          if (tree.tier !== "thin" && tree.tier !== "split") {
            floorBreak.push(`${pid}/${r.key}: package-borne read reached ${tree.tier}`);
          }
          if (tree.weight === "full" || tree.weight === "strong") {
            floorBreak.push(`${pid}/${r.key}: package-borne read weighted ${tree.weight}`);
          }
          if (tree.directional && adv > 0 && opp > 0) {
            floorBreak.push(`${pid}/${r.key}: package-borne read took a side on ${adv}-${opp}`);
          }
          if (tree.directional && !pkgLine(tree.note)) {
            floorBreak.push(`${pid}/${r.key}: package-borne read does not say how it arrived`);
          }
          if (tree.directional && !tree.packageOnly) {
            floorBreak.push(`${pid}/${r.key}: package-borne read is not flagged as one`);
          }
        }
        if (d.state !== "reads") {
          bad.push(`${pid}/${r.key}: display lane published ${tree.label}, dossier ${d.state}`);
        }
      }
      // …and the far side of the same line.
      if (why === "incidental") {
        incid++;
        if (voteLane && idx && (idx.primary || 0) >= 1) {
          floorBreak.push(`${pid}/${r.key}: incidental on primary=${idx.primary}`);
        }
        if (published) floorBreak.push(`${pid}/${r.key}: incidental under a published ${tree.label}`);
      }
    }
  }
  must(rows > 5000, `too few rows swept (${rows})`);
  must(thinSupport > 20 && thinOppose > 20,
    `both sides must be represented in the sweep (support ${thinSupport}, oppose ${thinOppose})`);
  // Every published thin read in this corpus arrives through the pattern engine —
  // including curtis/housing, whose one primary-mapped vote the one-act lean
  // characterises directly. The display lane's contribution here is the `split`
  // rows, which is the population the deferral was built for. Both must be
  // present, or the sweep is only testing one of the two paths.
  must(viaPattern > 20, `no published thin read came through the pattern engine (${viaPattern})`);
  must(viaDisplayAny > 20, `the display lane published nothing to check (${viaDisplayAny})`);
  must(incid > 100, `the incidental refusal has stopped firing (${incid} rows) — the sweep proves nothing`);
  must(pkgBorne > 100, `no package-borne reads in the sweep (${pkgBorne}) — the ceiling proves nothing`);
  eq(bad.length, 0, `no published thin row reaches a refusal — ${bad.slice(0, 3).join(" | ")}`);
  eq(floorBreak.length, 0,
    `each path to a published thin read excludes the refusal — ${floorBreak.slice(0, 3).join(" | ")}`);
  console.log(`      ${rows} rows · ${thinSupport} thin-support + ${thinOppose} thin-oppose published, 0 refused`);
  console.log(`      thin: ${viaPattern} via the pattern tier (answered at step 1), ${viaDisplay} via the display lane`);
  console.log(`      ${viaDisplayAny} display-lane reads at any tier, every one read by the dossier`);
  console.log(`      ${pkgBorne} of them stand on primary=0: all thin or split, all uniform, all disclosed`);
  console.log(`      ${incid} incidental refusals, every one on primary=0 with nothing published`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n  test-record-pack-no-downgrade — ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures.slice(0, 20)) console.error(`   ✗ ${f}`);
  if (failures.length > 20) console.error(`   … and ${failures.length - 20} more`);
  process.exit(1);
}
console.log(`\n   ${passed} checks passed`);
console.log("✓ record-pack-no-downgrade: the six-hour snapshot cannot outrank the live read");
