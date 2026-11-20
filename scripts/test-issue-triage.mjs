#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-issue-triage.mjs — tension first, topic families, record only collapsed
// ─────────────────────────────────────────────────────────────────────────────
// The Key Issue Stances section on the person profile, the Related issues
// section on the person file and the related-issues block in the issue drawer
// all arrange their rows the same way (PDXRelatedIssues.triage):
//
//   1. FAMILIES: every family key is a related-issues MAP key and every MAP key
//      sits in exactly one family; a key outside MAP reads "Other". The map is
//      not touched.
//   2. TENSION: a stated position whose record runs against it (Word vs
//      Action's Contradicted / Mixed, or the line's own clash) is a tension
//      row; a row with no stated position never is.
//   3. DRAWER: a contradicted or mixed related issue leads the block under
//      "Where the record runs against the stated position"; the rest follow
//      under family headers; record-only lines sit in a closed <details> that
//      holds the very same lines. No tension: no tension heading.
//   4. PERSON-FILE SECTION: the same, block by block.
//   5. KEY ISSUE STANCES: a contradicted or mixed card leads under the same
//      heading; the rest sit under family headers; a card with formal acts and
//      no stated position sits in a closed "Record only" disclosure holding
//      renderCard's own card. No tension: no tension block.
//   6. OTHER RECORDS: the voting record's procedural list is a closed
//      disclosure holding the same cards.
//   7. REAL DATA: drawer and section agree on the tension set.
//
//   node scripts/test-issue-triage.mjs
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
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const TENSION = "Where the record runs against the stated position";

// ── light boot: the map module over fixture stances and record reads ────────
const st = (s) => ({ stance: s, text: "fixture" });
function bootLight(pos, rec, wva) {
  const win = makeSandbox();
  win._polPositionMap = (pid) => pos[pid] || {};
  // rec[pid][key] = "advances" | "opposes" (one-way) | "split" (votes, no way)
  win._pdxRecordDirection = (pid, key) => {
    const r = (rec[pid] || {})[key];
    if (!r) return null;
    if (r === "split") return { characterised: false, lead: null, total: 2, advances: 1, opposes: 1 };
    return { characterised: true, lead: r, total: 3 };
  };
  if (wva) win.PDXWordAction = { outcomeBuckets: (pid) => wva[pid] || null };
  const ctx = vm.createContext(win);
  for (const f of ["issue-map.js", "issue-colors.js", "related-issues.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return win;
}

// ── 1 · families ────────────────────────────────────────────────────────────
{
  const win = bootLight({}, {});
  const RI = win.PDXRelatedIssues;
  const seen = {};
  for (const f of RI.FAMILIES) {
    ok(f.id && f.label, "a family has no id or label");
    for (const k of f.keys) {
      ok(k in RI.MAP, `family ${f.id} lists ${k}, which is not a related-issues map key`);
      ok(!seen[k], `${k} sits in two families (${seen[k]} and ${f.id})`);
      seen[k] = f.id;
    }
  }
  for (const k of Object.keys(RI.MAP)) ok(!!seen[k], `map key ${k} belongs to no family`);
  for (const lbl of ["Taxes & Government", "Economy & Jobs", "Energy", "Immigration & Border"]) {
    ok(RI.FAMILIES.some((f) => f.label === lbl), `no "${lbl}" family header`);
  }
  eq(RI.familyOf("lower_taxes").label, "Taxes & Government", "lower_taxes is not under Taxes & Government");
  eq(RI.familyOf("econ_growth").label, "Economy & Jobs", "econ_growth is not under Economy & Jobs");
  eq(RI.familyOf("energy_production").label, "Energy", "energy_production is not under Energy");
  eq(RI.familyOf("border_security").label, "Immigration & Border", "border_security is not under Immigration & Border");
  eq(RI.familyOf("no_such_key").id, "other", "a key outside the map is not in Other");
  eq(RI.familyOf("").id, "other", "a card with no key is not in Other");
}

// ── 2 · the tension read ────────────────────────────────────────────────────
{
  const win = bootLight({}, {});
  const RI = win.PDXRelatedIssues;
  const T = (dir, item, tokens) => RI.tensionOf("x", "k", { dir, item, tokens: tokens || null });
  eq(T("support", { rec: "against" }), "contradicts", "stated support, record against: not contradicted");
  eq(T("oppose", { rec: "with" }), "contradicts", "stated oppose, record with: not contradicted");
  eq(T("support", { rec: "with" }), null, "stated support, record with: read as tension");
  eq(T("support", { tally: "1 for · 1 against" }), "mixed", "stated support over a split tally: not mixed");
  eq(T("support", { tally: "2 for · 0 against" }), null, "a one-sided tally is read as tension");
  eq(T(null, { rec: "against" }), null, "no stated position is read as tension");
  eq(T("support", { rec: "with" }, { k: "mixed" }), "mixed", "Word vs Action's Mixed verdict is not honoured");
  eq(T("support", { rec: "with" }, { k: "contradicts" }), "contradicts", "Word vs Action's Contradicted verdict is not honoured");
  eq(RI.tensionOf("x", "k", { stated: true, dir: null, tokens: { k: "mixed" } }), "mixed", "a stated mixed card with a Mixed verdict is not tension");
  eq(RI.tensionOf("x", "k", { stated: false, tokens: { k: "contradicts" } }), null, "a row with no stated position took a verdict");
}

// ── 3 · drawer ──────────────────────────────────────────────────────────────
const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>$/.exec(h) || [""])[0];
const POS = {
  // Protect Public Lands' drawer: lands_keep_public (lands & water) stated and
  // contradicted; energy_production (energy) stated; gov_regulation (taxes &
  // government) stated mixed by tally; lands_local stated, no record;
  // lands_balance record only.
  tense: { lands_keep_public: st("support"), energy_production: st("oppose"), gov_regulation: st("support"), lands_local: st("oppose") },
  calm: { lands_keep_public: st("support"), energy_production: st("oppose"), lands_local: st("oppose") },
};
const REC = {
  tense: { lands_keep_public: "opposes", gov_regulation: "split", lands_balance: "advances", water: "advances" },
  calm: { lands_keep_public: "advances", lands_balance: "advances" },
};
{
  const win = bootLight(POS, REC);
  const RI = win.PDXRelatedIssues;
  const h = RI.drawerHtml("tense", {}, "lands_preserve");
  const b = block(h);
  ok(!!b, "fixture drawer: no related-issues block");
  // The tension block leads, holding exactly the contradicted and mixed lines.
  const iT = b.indexOf(TENSION);
  ok(iT > 0 && iT < b.indexOf('data-pdxri-family='), "drawer: the tension heading does not lead the block");
  const tenseKeys = [...b.slice(iT, b.indexOf('data-pdxri-family=')).matchAll(/class="pdxri-item" data-pdxri-key="([^"]+)"/g)].map((m) => m[1]);
  eq(JSON.stringify(tenseKeys), JSON.stringify(["lands_keep_public", "gov_regulation"]), "drawer: the tension block does not hold the contradicted and mixed lines");
  // Families follow, in FAMILIES order, each with its header.
  const fams = [...b.matchAll(/<li class="pdxri-sub" data-pdxri-family="([^"]+)"[^>]*>([^<]*)<\/li>/g)].map((m) => m[2].replace(/&amp;/g, "&"));
  eq(JSON.stringify(fams), JSON.stringify(["Energy", "Public Lands & Water"]), "drawer: family headers are not the expected ones, in order");
  const famOf = (key) => { const at = b.indexOf(`data-pdxri-key="${key}"`); const hdr = b.lastIndexOf('<li class="pdxri-sub"', at); return text(b.slice(hdr, b.indexOf("</li>", hdr))); };
  eq(famOf("energy_production"), "Energy", "drawer: energy_production is not under Energy");
  eq(famOf("lands_local"), "Public Lands & Water", "drawer: lands_local is not under Public Lands & Water");
  // Record only: closed, after the families, holding the same lines.
  const ro = (/<details class="pdxri-ro"[^>]*>[\s\S]*?<\/details>/.exec(b) || [""])[0];
  ok(!!ro, "drawer: no Record only disclosure");
  ok(!/<details[^>]*\sopen/.test(ro), "drawer: the Record only disclosure starts open");
  ok(/<summary[^>]*>Record only/.test(ro), "drawer: the disclosure is not labelled Record only");
  const roKeys = [...ro.matchAll(/data-pdxri-key="([^"]+)"/g)].map((m) => m[1]).sort();
  eq(JSON.stringify(roKeys), JSON.stringify(["lands_balance", "water"]), "drawer: the Record only disclosure does not hold the record-only lines");
  ok(b.indexOf("<details") > b.lastIndexOf('data-pdxri-family='), "drawer: Record only does not come after the families");
  // Expanding shows the original lines: each line inside is the line the
  // module prints for that issue anywhere else, byte for byte.
  for (const it of RI.itemsFor("tense", {}, "lands_preserve")) {
    const li = (new RegExp(`<li class="pdxri-item" data-pdxri-key="${it.key}"[\\s\\S]*?</li>`).exec(b) || [""])[0];
    eq(text(li), RI.lineText(it), `drawer: ${it.key} line changed words`);
  }
  eq(new Set([...b.matchAll(/class="pdxri-item" data-pdxri-key="([^"]+)"/g)].map((m) => m[1])).size,
    RI.itemsFor("tense", {}, "lands_preserve").length, "drawer: a line was dropped or repeated");
  // Nothing contradicted or mixed: no tension heading at all.
  const c = block(RI.drawerHtml("calm", {}, "lands_preserve"));
  ok(!!c && !c.includes(TENSION) && !/data-pdxri-block="tension"/.test(c), "drawer: a tension heading prints with no contradicted or mixed line");
  // Word vs Action's verdict puts a line with no clash of its own in the block.
  const w2 = bootLight(POS, REC, { calm: { buckets: { mixed: [{ key: "energy_production" }] } } });
  const c2 = block(w2.PDXRelatedIssues.drawerHtml("calm", {}, "lands_preserve"));
  ok(c2.includes(TENSION) && /pdxri-sub-tension[^>]*>[^<]*<\/li><li class="pdxri-item" data-pdxri-key="energy_production"/.test(c2),
    "drawer: a Mixed verdict from Word vs Action does not lead the block");
}

// ── 4 · person-file section ─────────────────────────────────────────────────
{
  const win = bootLight({ tense: Object.assign({ lands_preserve: st("support") }, POS.tense), calm: Object.assign({ lands_preserve: st("support") }, POS.calm),
    ro: {} }, Object.assign({}, REC, { ro: { lands_preserve: "advances", lands_keep_public: "opposes" } }));
  const RI = win.PDXRelatedIssues;
  const h = RI.sectionHtml("tense", {});
  ok(h.startsWith('<div id="pdxsec-related-issues"'), "section: not rendered");
  const iT = h.indexOf('data-pdxri-block="tension"');
  ok(iT > 0 && h.indexOf(TENSION) > iT && (h.indexOf("data-pdxri-family=") < 0 || iT < h.indexOf("data-pdxri-family=")),
    "section: the tension block does not lead");
  const tBlock = h.slice(iT, h.indexOf("data-pdxri-family=") > 0 ? h.indexOf("data-pdxri-family=") : h.length);
  ok(/data-pdxri-key="lands_keep_public"/.test(tBlock), "section: the contradicted issue is not in the tension block");
  const calm = RI.sectionHtml("calm", {});
  ok(calm && !calm.includes(TENSION), "section: a tension heading prints with nothing contradicted or mixed");
  ok(/<div class="pdxri-sub">Public Lands &amp; Water<\/div>/.test(calm), "section: no Public Lands & Water family header");
  // A file with no stated position anywhere: every block is record only, closed.
  const ro = RI.sectionHtml("ro", {});
  ok(/<details class="pdxri-ro" data-pdxri-collapsed="record-only">/.test(ro) && !/<details[^>]*\sopen/.test(ro),
    "section: record-only blocks are not in a closed disclosure");
  ok(!/data-pdxri-family=/.test(ro), "section: a record-only block sits under a family header");
  ok(/<li class="pdxri-group" data-pdxri-issue="lands_preserve">/.test(ro), "section: the record-only block is not inside the disclosure");
}

// ── 5 · Key Issue Stances ───────────────────────────────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js", "related-issues.js",
];
function bootFull() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  // PDXStance is inline in the page shells; a faithful-enough stub.
  const MAP = { support: "supported", oppose: "opposed", mixed: "mixed" };
  win.PDXStance = {
    isTopPriority: () => false,
    resolveStance: (s) => MAP[(s && (s.issueStance || s.pos)) || ""] || "none",
    stanceState: (k) => ({ cls: k, label: k }),
    stancePill: (k) => `<span class="pdxis-stance pdxis-stance-${k}">${k}</span>`,
  };
  return win;
}
{
  const win = bootFull();
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const PID = "pdx_kis_fixture";
  const P = { name: "Fixture Person", office: "U.S. Representative", state: "Utah" };
  win.CMP_DATA[PID] = P;
  const card = (issueKey, pos, topic) => ({ topic, icon: "•", pos, issueStance: pos, issueKey, text: `${topic} text` });
  const STANCES = [
    card("lower_taxes", "support", "Cut Taxes"),          // Taxes & Government, record with
    card("border_security", "support", "Border"),         // contradicted by Word vs Action
    card("energy_production", "oppose", "Energy Card"),   // Energy, record against (consistent)
    card("econ_growth", "mixed", "Growth"),               // Mixed by Word vs Action
    card("gun_rights", "tracking", "Guns Record"),        // no stated position, votes on file → record only
    card("pdx_local_only", "support", "Local Thing"),     // not in the map → Other
  ];
  const realResolve = win._resolveStanceList;
  win._resolveStanceList = (id, p) => (id === PID ? STANCES.map((s) => Object.assign({}, s)) : realResolve(id, p));
  const realDir = win._pdxRecordDirection;
  const RECD = { lower_taxes: "advances", energy_production: "opposes", gun_rights: "advances", border_security: "advances" };
  win._pdxRecordDirection = (pid, key, o) => (pid === PID ? (RECD[key] ? { characterised: true, lead: RECD[key], total: 3 } : null) : realDir(pid, key, o));
  const realWA = win.PDXWordAction.outcomeBuckets;
  let buckets = { buckets: { contradicts: [{ key: "border_security" }], mixed: [{ key: "econ_growth" }], consistent: [{ key: "lower_taxes" }] } };
  win.PDXWordAction.outcomeBuckets = (pid) => (pid === PID ? buckets : realWA(pid));

  const h = win._renderIssueStances(PID, P) || "";
  ok(h.includes("Key Issue Stances"), "Key Issue Stances: the section does not render");
  const tb = (/<div class="stance-cat stance-tension" data-kis-block="tension">[\s\S]*?(?=<div class="stance-cat" data-kis-family=|<details|$)/.exec(h) || [""])[0];
  ok(!!tb, "Key Issue Stances: no tension block");
  ok(tb.includes(TENSION), "Key Issue Stances: the tension block is not headed with the tension heading");
  ok(tb.includes("Border") && tb.includes("Growth"), "Key Issue Stances: the contradicted and mixed cards are not in the tension block");
  ok(!/Cut Taxes|Energy Card|Guns Record|Local Thing/.test(text(tb)), "Key Issue Stances: a card that is not contradicted or mixed is in the tension block");
  ok(h.indexOf("data-kis-block=\"tension\"") < h.indexOf("data-kis-family="), "Key Issue Stances: the tension block does not lead");
  const fams = [...h.matchAll(/<div class="stance-cat" data-kis-family="([^"]+)">\s*<div class="stance-cat-head"><span class="stance-cat-ico">[^<]*<\/span>([^<]*)</g)].map((m) => m[2]);
  eq(JSON.stringify(fams), JSON.stringify(["Taxes & Government", "Energy", "Other"]), "Key Issue Stances: family headers are not the expected ones, in order");
  const famBlock = (id) => (new RegExp(`<div class="stance-cat" data-kis-family="${id}">[\\s\\S]*?(?=<div class="stance-cat"|<div class="stance-cat stance-|<details|<p class="src-note"|$)`).exec(h) || [""])[0];
  ok(famBlock("taxes_gov").includes("Cut Taxes"), "Key Issue Stances: Cut Taxes is not under Taxes & Government");
  ok(famBlock("energy").includes("Energy Card"), "Key Issue Stances: the energy card is not under Energy");
  ok(famBlock("other").includes("Local Thing"), "Key Issue Stances: a key outside the map is not under Other");
  // Record only: closed, holding renderCard's own card.
  const ro = (/<details class="stance-cat stance-ro" data-kis-collapsed="record-only">[\s\S]*?<\/details>/.exec(h) || [""])[0];
  ok(!!ro, "Key Issue Stances: no Record only disclosure");
  ok(!/<details[^>]*\sopen/.test(ro), "Key Issue Stances: the Record only disclosure starts open");
  ok(/<summary[^>]*>[\s\S]*Record only/.test(ro), "Key Issue Stances: the disclosure is not labelled Record only");
  ok(ro.includes("Guns Record") && !/Cut Taxes|Border|Energy Card/.test(ro), "Key Issue Stances: the Record only disclosure does not hold exactly the record-only card");
  // Expanding shows the original card: the card inside the disclosure is the
  // same markup the section prints without the triage module.
  const RI = win.PDXRelatedIssues;
  win.PDXRelatedIssues = undefined;
  const plain = win._renderIssueStances(PID, P) || "";
  win.PDXRelatedIssues = RI;
  const cardOf = (html, topic) => {
    const at = html.indexOf(`>${topic}</span>`);
    const s = html.lastIndexOf('<div class="stance-card', at);
    return at > 0 && s >= 0 ? html.slice(s, at) : "";
  };
  for (const t of ["Cut Taxes", "Border", "Energy Card", "Growth", "Guns Record", "Local Thing"]) {
    ok(cardOf(h, t) && cardOf(h, t) === cardOf(plain, t), `Key Issue Stances: the ${t} card changed`);
  }
  ok(!plain.includes(TENSION) && !plain.includes("<details"), "Key Issue Stances: the no-module fallback took the new layout");
  // No contradicted or mixed card: no tension block.
  buckets = { buckets: { consistent: [{ key: "lower_taxes" }, { key: "border_security" }, { key: "econ_growth" }] } };
  RECD.border_security = "advances";
  const calm = win._renderIssueStances(PID, P) || "";
  ok(!calm.includes(TENSION) && !/data-kis-block="tension"/.test(calm), "Key Issue Stances: a tension block prints with nothing contradicted or mixed");
  ok(/data-kis-collapsed="record-only"/.test(calm), "Key Issue Stances: the Record only disclosure went missing");
  // A stated card whose own record runs against it is contradicted even
  // before Word vs Action has a verdict for it.
  buckets = null;
  RECD.lower_taxes = "opposes";
  const early = win._renderIssueStances(PID, P) || "";
  const etb = (/<div class="stance-cat stance-tension"[\s\S]*?(?=<div class="stance-cat" data-kis-family=|<details|$)/.exec(early) || [""])[0];
  ok(etb.includes("Cut Taxes"), "Key Issue Stances: a stated support with a record against is not in the tension block");

  // ── 6 · Other records: closed disclosure, same cards ──
  const VR = R("voting-record.js");
  ok(/key === '_none'[\s\S]{0,200}<details class="vr-group vr-group-other" data-vr-collapsed="other">/.test(VR),
    "voting record: Other records is not a closed disclosure");
  ok(!/<details class="vr-group vr-group-other"[^']*open/.test(VR), "voting record: Other records starts open");
  ok(/'<summary class="vr-group-sum">' \+ head \+ '<\/summary>' \+ cards \+ '<\/details>'/.test(VR),
    "voting record: Other records does not hold the same head and cards");
}

// ── 7 · real data: the drawer and the section agree on what is tension ──────
{
  const win = bootFull();
  const RI = win.PDXRelatedIssues;
  let drawers = 0, tenseDrawers = 0;
  for (const pid of ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis"]) {
    const p = win.CMP_DATA[pid];
    for (const key of Object.keys(RI.MAP)) {
      const h = RI.drawerHtml(pid, p, key);
      if (!h) continue;
      drawers++;
      const items = RI.itemsFor(pid, p, key);
      const want = items.filter((it) => RI.tensionOf(pid, it.key, { dir: it.dir, item: it })).map((it) => it.key);
      const b = block(h);
      const tPart = b.includes(TENSION) ? b.slice(b.indexOf(TENSION), (b.indexOf('data-pdxri-family=') > 0 ? b.indexOf('data-pdxri-family=') : b.indexOf("pdxri-ro-li") > 0 ? b.indexOf("pdxri-ro-li") : b.length)) : "";
      const got = [...tPart.matchAll(/class="pdxri-item" data-pdxri-key="([^"]+)"/g)].map((m) => m[1]);
      if (JSON.stringify(got) !== JSON.stringify(want)) { failures.push(`${pid} × ${key}: drawer tension block ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); continue; }
      passed++;
      if (want.length) tenseDrawers++;
      else ok(!b.includes(TENSION), `${pid} × ${key}: a tension heading with no tension line`);
      ok(!/<details[^>]*\sopen/.test(b), `${pid} × ${key}: a disclosure starts open`);
    }
    const sec = RI.sectionHtml(pid, p);
    if (sec && sec.includes(TENSION)) ok(sec.indexOf(TENSION) < (sec.indexOf("data-pdxri-family=") >>> 0), `${pid}: the section's tension block does not lead`);
  }
  ok(drawers > 50, `real corpus: only ${drawers} drawers sampled`);
  ok(tenseDrawers > 0, "real corpus: no sampled drawer has a tension line — the block is untested on real data");
  console.log(`   real corpus: ${drawers} drawers · ${tenseDrawers} with a tension block`);
}

// ── wiring ──────────────────────────────────────────────────────────────────
{
  const sw = R("sw.js");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 590, "the shell did not move for the changed precached scripts");
  ok(/v590 - [\s\S]*?MIGRATION COST: none/.test(sw), "the shell's v590 note does not say no migration");
}

if (failures.length) {
  console.error(`\n✗ issue-triage: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ issue-triage: all ${passed} assertions passed`);
