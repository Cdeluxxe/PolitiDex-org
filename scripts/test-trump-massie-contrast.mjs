#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-trump-massie-contrast.mjs — the cited Trump–Massie contrast
// ─────────────────────────────────────────────────────────────────────────────
// The circulating Trump–Massie graphic raises eight issues. Each is filed on an
// EXISTING issue key (no key is added):
//   spending / debt / omnibus bills  → cut_spending, national_debt
//   warrantless surveillance / 702   → privacy_rights
//   COVID spending / CARES Act       → cut_spending
//   gun rights / bump stocks         → gun_rights, gun_safety
//   corporate bailouts / stimulus    → cut_spending (the CARES Act lending fund)
//   tariffs / free trade             → tariffs_authority (plus the existing tariff keys)
//   IRS / income tax                 → lower_taxes
//   medical freedom / mandates       → medical_freedom
//
//   1. KEYS ON BOTH PROFILES: every key above resolves to a published stance
//      on both files, with the directions the cited cards carry; keys either
//      person already held keep the position they had (new cards are appended).
//   2. EVERY CARD CITES: each added card names a document, a date and an
//      https source on an allowed host; none cites whitehouse.gov.
//   3. THE MAP: the one new pair (privacy_rights / congress_oversight) is in the
//      map both ways, between register keys, and the whole map stays symmetric.
//   4. THE DRAWER SURFACES THE CONTRAST on spending, surveillance and guns.
//   5. THE RELATED-ISSUES SECTION carries the same contrast on both files.
//   6. THE EXEC FALLBACK is only for an office that casts no roll calls.
//   7. THE SHELL moved for the precached change.
//
//   node scripts/test-trump-massie-contrast.mjs
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

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js",
];
const corpus = buildCorpus(ROOT);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
const lineFor = (ls, label) => ls.find((l) => l.startsWith(label + ":")) || null;

const win = boot();
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAPI = win.ISSUE_MAP;
const P = { massie: win.CMP_DATA.massie, trump: win.CMP_DATA.trump };
ok(!!P.massie && !!P.trump, "Massie or Trump has no profile row");
const pm = { massie: win._polPositionMap("massie", P.massie) || {}, trump: win._polPositionMap("trump", P.trump) || {} };

// ── 1 · the keys, on both profiles ──────────────────────────────────────────
const WANT = {
  cut_spending:      { massie: "support", trump: "support" },
  national_debt:     { massie: "support", trump: "support" },
  privacy_rights:    { massie: "support", trump: "oppose" },
  gun_rights:        { massie: "support", trump: "support" },
  gun_safety:        { massie: "oppose",  trump: "support" },
  tariffs_authority: { massie: "support", trump: "oppose" },
  lower_taxes:       { massie: "support", trump: "support" },
  medical_freedom:   { massie: "support", trump: "support" },
};
for (const [k, want] of Object.entries(WANT)) {
  ok(!!MAPI[k], `${k} is not in the issue register`);
  for (const pid of ["massie", "trump"]) {
    const got = pm[pid][k] && pm[pid][k].stance;
    ok(got === want[pid], `${pid} × ${k}: stated ${got}, want ${want[pid]}`);
  }
}

// ── 2 · every added card cites a document, a date and a source ──────────────
const ADDED = {
  trump: ["Right to Keep and Bear Arms", "No Money for Schools With Mandates", "FISA Section 702 Reauthorization (2018)", "“KILL FISA” (2024)", "Section 702 Extension (2026)",
    "Bump-Stock Ban", "“Take the Guns First”", "Second Amendment Order", "2018 Omnibus Spending Bill",
    "CARES Act & Corporate Lending", "December 2020 Spending & Relief Package",
    "COVID-19 Vaccine Mandates in Schools", "2020 Federal Coronavirus Guidelines",
    "The IRS & an “External Revenue Service”"],
  massie: ["Omnibus Spending Bills", "Full-Year Continuing Resolution (2025)", "CARES Act & Pandemic Spending",
    "FISA Section 702 Votes (2018)", "FISA Section 702 Votes (2024–2026)", "The Bump-Stock Rule",
    "Votes on the Canada Tariff Emergency", "2017 Tax Cuts and Jobs Act", "COVID-19 Vaccine Mandates",
    "The Pandemic Response"],
};
const HOSTS = /^https:\/\/(www\.)?(clerk\.house\.gov|govinfo\.gov|federalregister\.gov|presidency\.ucsb\.edu|cnn\.com|cnbc\.com|nbcnews\.com|rollcall\.com|time\.com|newsweek\.com|theepochtimes\.com|reason\.com|pbs\.org)\//;
const list = { massie: win._resolveStanceList("massie", P.massie) || [], trump: win._resolveStanceList("trump", P.trump) || [] };
for (const [pid, topics] of Object.entries(ADDED)) {
  for (const t of topics) {
    const c = list[pid].filter((s) => s.topic === t);
    ok(c.length === 1, `${pid}: card "${t}" found ${c.length} times`);
    const s = c[0];
    if (!s) continue;
    ok(!!MAPI[s.issueKey], `${pid} "${t}": ${s.issueKey} is not a register key`);
    ok(Object.keys(WANT).includes(s.issueKey), `${pid} "${t}": ${s.issueKey} is outside the eight issues`);
    ok(s.pos === s.issueStance && /^(support|oppose|mixed)$/.test(s.issueStance), `${pid} "${t}": pos/issueStance disagree`);
    ok(s.source && HOSTS.test(s.source.url || ""), `${pid} "${t}": source ${s.source && s.source.url} is not an allowed https host`);
    ok(!/whitehouse\.gov/i.test(JSON.stringify(s)), `${pid} "${t}": cites whitehouse.gov`);
    ok(/\b(19|20)\d\d\b/.test(s.text + " " + (s.evidence || "")), `${pid} "${t}": no dated record`);
    ok(/(Roll Call \d+|Public Law \d+-\d+|Executive Order \d+|\d+ FR \d+|post|interview|meeting|video|Truth Social|X,|announced|Platform|rallies)/.test(s.evidence || ""), `${pid} "${t}": evidence names no vote, law, order, rule or dated statement`);
    ok(!/\b(Republicans|Democrats) (voted|opposed|supported)|party[- ]line/i.test(s.text), `${pid} "${t}": partisan grouping in the text`);
  }
}
// New cards on keys a person already held come after the earlier card, so the
// stated position on those keys did not move.
for (const [pid, topics] of Object.entries(ADDED)) {
  for (const t of topics) {
    const i = list[pid].findIndex((s) => s.topic === t);
    if (i < 0) continue;
    const k = list[pid][i].issueKey;
    const first = list[pid].findIndex((s) => s.issueKey === k);
    const firstIsNew = topics.includes(list[pid][first].topic);
    ok(first === i || !firstIsNew || list[pid].slice(0, i).some((s) => s.issueKey === k), `${pid} "${t}" is out of order`);
  }
}
// The leading Trump card on each key that wave 14 gave formal actions is a
// statement independent of those documents, so the stance is tested by them.
for (const [k, lead] of [["privacy_rights", "Section 702 Extension (2026)"], ["gun_safety", "“Take the Guns First”"],
  ["gun_rights", "Right to Keep and Bear Arms"], ["medical_freedom", "No Money for Schools With Mandates"]]) {
  const first = list.trump.find((s) => s.issueKey === k && s.issueStance !== "mixed");
  ok(first && first.topic === lead, `trump × ${k}: leading card is "${first && first.topic}", want "${lead}"`);
}
// Cards with Roll Call citations for Massie point at the House Clerk.
for (const s of list.massie.filter((x) => ADDED.massie.includes(x.topic) && /Roll Call/.test(x.evidence || ""))) {
  ok(/clerk\.house\.gov/.test(s.source.url), `massie "${s.topic}": a roll-call card does not cite the House Clerk`);
}

// ── 3 · the map ─────────────────────────────────────────────────────────────
ok(RI.MAP.privacy_rights.includes("congress_oversight") && RI.MAP.congress_oversight.includes("privacy_rights"), "privacy_rights / congress_oversight is not in the map both ways");
for (const [k, rel] of Object.entries(RI.MAP)) {
  ok(!!MAPI[k], `map key ${k} is not in the register`);
  for (const r of rel) {
    ok(!!MAPI[r], `${k} → ${r}: ${r} is not in the register`);
    ok(RI.MAP[r] && RI.MAP[r].includes(k), `${k} → ${r} is not symmetric`);
  }
}

// ── 4 · the drawer surfaces the contrast ────────────────────────────────────
const drawer = (pid, k) => lines(CS.gapViewHtml(pid, k) || "");
// Spending: Massie's debt record runs with; Trump's signed record on the debt
// is a formal-act tally with at least one act against; and on defense the two
// stated positions part.
{
  const m = drawer("massie", "cut_spending"), t = drawer("trump", "cut_spending");
  ok(lineFor(m, "Tackle the National Debt") === "Tackle the National Debt: supports · voting record runs with", `Massie spending drawer: ${JSON.stringify(m)}`);
  const td = lineFor(t, "Tackle the National Debt") || "";
  const tm = /^Tackle the National Debt: supports · (\d+) for · (\d+) against$/.exec(td);
  ok(!!tm && Number(tm[2]) >= 1, `Trump spending drawer does not carry his signed record on the debt: ${JSON.stringify(t)}`);
  ok(/^Peace Through Strength: opposes · /.test(lineFor(m, "Peace Through Strength") || "") && /^Peace Through Strength: supports · /.test(lineFor(t, "Peace Through Strength") || ""),
     "the spending drawers do not part on Peace Through Strength");
}
// Surveillance: Privacy & Big-Tech Accountability, supports vs opposes, in the
// oversight drawer (the new pair) and the digital-dollar drawer.
for (const k of ["congress_oversight", "crypto_cbdc"]) {
  const m = lineFor(drawer("massie", k), "Privacy & Big-Tech Accountability") || "";
  const t = lineFor(drawer("trump", k), "Privacy & Big-Tech Accountability") || "";
  ok(/^Privacy & Big-Tech Accountability: supports · /.test(m), `Massie ${k} drawer: ${m}`);
  ok(/^Privacy & Big-Tech Accountability: opposes · /.test(t), `Trump ${k} drawer: ${t}`);
}
{
  const m = drawer("massie", "privacy_rights");
  ok(!!lineFor(m, "Congressional Oversight"), `Massie's privacy drawer does not list Congressional Oversight: ${JSON.stringify(m)}`);
}
// Guns: Stronger Gun Safety Laws, opposes vs supports, in the gun-rights drawer;
// Protect Gun Rights in the gun-safety drawer on both.
{
  const m = lineFor(drawer("massie", "gun_rights"), "Stronger Gun Safety Laws") || "";
  const t = lineFor(drawer("trump", "gun_rights"), "Stronger Gun Safety Laws") || "";
  ok(/^Stronger Gun Safety Laws: opposes · /.test(m), `Massie gun drawer: ${m}`);
  ok(/^Stronger Gun Safety Laws: supports · /.test(t), `Trump gun drawer: ${t}`);
  ok(/^Protect Gun Rights: supports · /.test(lineFor(drawer("massie", "gun_safety"), "Protect Gun Rights") || "") &&
     /^Protect Gun Rights: supports · /.test(lineFor(drawer("trump", "gun_safety"), "Protect Gun Rights") || ""),
     "Protect Gun Rights is missing from a gun-safety drawer");
}

// ── 5 · the related-issues section ──────────────────────────────────────────
const anchors = (pid) => {
  const h = RI.sectionHtml(pid, P[pid]) || "";
  const out = {};
  for (const m of h.matchAll(/<(?:div|li) class="pdxri-(?:anchor|item)" data-pdxri-key="([^"]+)" data-pdxri-line="both" data-pdxri-dir="([^"]+)"/g)) out[m[1]] = m[2];
  return out;
};
const A = { massie: anchors("massie"), trump: anchors("trump") };
for (const [k, d] of [["privacy_rights", ["support", "oppose"]], ["gun_safety", ["oppose", "support"]], ["cut_spending", ["support", "support"]], ["medical_freedom", ["support", "support"]]]) {
  ok(A.massie[k] === d[0], `Massie's related-issues section: ${k} reads ${A.massie[k]}, want ${d[0]}`);
  ok(A.trump[k] === d[1], `Trump's related-issues section: ${k} reads ${A.trump[k]}, want ${d[1]}`);
}

// ── 6 · the exec fallback is for an office that casts no roll calls ─────────
ok(win.PDXExecRecord.eligible("trump") === true, "Trump is not an executive-record office");
ok(win.PDXExecRecord.eligible("massie") === false, "Massie reads as an executive-record office");
ok(RI.hasVotes("trump", "national_debt") === true, "Trump's signed record on the debt does not count as a record");
{
  const src = R("related-issues.js");
  ok(/function execActsTally\(pid, key\)[\s\S]*?E\.eligible\(pid\)/.test(src), "the formal-act fallback is not gated on the executive record");
}

// ── 6b · the executive record carries the four wave-14 keys ───────────────
{
  const EX = win.PDXExecRecord;
  for (const allTerms of [false, true]) {
    for (const k of ["privacy_rights", "gun_rights", "gun_safety", "medical_freedom"]) {
      const r = EX.issue("trump", k, allTerms ? { allTerms: true } : {});
      ok(r && r.actions.length > 0 && r.token !== "said_not_done", `trump × ${k} (${allTerms ? "all time" : "current term"}): ${r && r.token}`);
    }
    const sum = EX.summary("trump", allTerms ? { allTerms: true } : {});
    ok(sum && sum.issues.noActionFound === 0, `trump executive summary (${allTerms ? "all time" : "current term"}) has ${sum && sum.issues.noActionFound} stated issues with no action`);
  }
  const ids = (win.EXEC_ACTIONS.trump || []).map((a) => a.documentId);
  for (const id of ["Public Law 115-118", "Presidential Memorandum, 83 FR 7949", "Executive Order 14206", "Executive Order 14214", "Public Law 119-87"]) {
    ok(ids.includes(id), `${id} is not in the executive record`);
  }
  ok(/20261205000000_seed_exec_actions_wave14\.sql/.test(R("scripts/test-exec-seed.mjs")), "wave 14 is not read by the seed gate");
}

// ── 7 · the shell ───────────────────────────────────────────────────────────
{
  const sw = R("sw.js");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 555, "the shell did not move for the precached change");
  ok(/v555 - [\s\S]*?MIGRATION COST: none\./.test(sw), "the v555 note does not say no migration");
}

if (failures.length) {
  console.error(`✗ trump-massie contrast: ${failures.length} failure(s)`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`✓ trump-massie contrast: all ${passed} assertions passed`);
