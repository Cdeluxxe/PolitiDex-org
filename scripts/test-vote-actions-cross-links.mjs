#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions-cross-links.mjs — curator-only cross-link in the issue drawer
// ─────────────────────────────────────────────────────────────────────────────
// A curated measure in a person's issue drawer and a raw vote row
// (pdx_vote_actions) that share a bill key get one short curator note under the
// measure. Pins:
//   1. the drawer's bill key equals the server's vrMeasureBillKey for every
//      curated row on file (one shared key, no new column)
//   2. both sides present → the note row, once, under the matching measure, with
//      the roll call, the official record and the stored-payload key
//   3. one side only (curated only, or raw rows on other bills) → the drawer
//      HTML is byte-identical to today
//   4. only the curator's session fetches; everyone else makes no request
//   5. the endpoint is curator-only, read-only, and groups rows by bill key
//
//   node scripts/test-vote-actions-cross-links.mjs   (no database, no network)

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
const ok = (c, m) => { if (c) passed++; else if (failures.length < 50) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "va-xl-"));
const build = async (entry, name, plugins = []) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
};
const VA = await build("netlify/lib/vote-actions-core.ts", "va");

// ── boot the drawer exactly as the drawer tests do ──────────────────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
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
const win = boot();
const CS = win.PDXConsistency;

// Every drawer with a vote table: its rows and their bill keys.
const drawers = [];
for (const pid of Object.keys(win.CMP_DATA)) {
  let keys = [];
  try { keys = (CS.issueRows(pid) || []).map((r) => r.key); } catch { continue; }
  for (const key of keys) {
    let t = null;
    try { t = CS.dossierTally(pid, key); } catch { continue; }
    if (t && t.rows && t.rows.length) drawers.push({ pid, key, rows: t.rows });
  }
}
ok(drawers.length > 50, `drawers with a vote table found (${drawers.length})`);

// ── 1 · one shared key ───────────────────────────────────────────────────────
let compared = 0, mismatched = [];
for (const dw of drawers) for (const p of dw.rows) {
  const d = p.d;
  const client = CS.voteActionBillKey(d);
  if (d.execAct) { ok(client === null, `${dw.pid}: an executive act has no bill key`); continue; }
  const server = VA.vrMeasureBillKey({ congress: parseInt(String(d.congress), 10), number: d.ident || d.billNum });
  if (server && /^us-\d+-(hr|s|hres|sres|hjres|sjres|hconres|sconres|hamdt|samdt|suamdt)-/.test(server)) {
    compared++;
    if (client !== server && mismatched.length < 5) mismatched.push(`${d.ident} (${d.congress}): drawer ${client} vs server ${server}`);
  }
}
ok(compared > 200 && !mismatched.length, `drawer bill key = vrMeasureBillKey on every curated row (${compared} compared) ${mismatched.join("; ")}`);
eq(CS.voteActionBillKey({ congress: "119th Congress", ident: "H.R. 5000" }), "us-119-hr-5000", "H.R. 5000 → us-119-hr-5000");
eq(CS.voteActionBillKey({ congress: "118th Congress", ident: "S.J.Res. 012" }), "us-118-sjres-12", "leading zeros dropped, joint resolution");
eq([CS.voteActionBillKey({ congress: "", ident: "H.R. 1" }), CS.voteActionBillKey({ congress: "119th Congress", ident: "PN 12-3" }), CS.voteActionBillKey(null)], [null, null, null], "no congress / nomination / nothing → no key");

// ── 2/3 · both sides, one side ───────────────────────────────────────────────
const dw = drawers.find((x) => x.rows.some((p) => !p.d.execAct && CS.voteActionBillKey(p.d)));
const target = dw.rows.find((p) => !p.d.execAct && CS.voteActionBillKey(p.d));
const bk = CS.voteActionBillKey(target.d);
const baseline = CS.gapViewHtml(dw.pid, dw.key);
ok(!/pdxlg-xl|raw vote feed/.test(baseline), "baseline drawer carries no cross-link markup");

const roll = { chamber: "house", congress: 119, session: 1, roll: 160, date: "2025-06-12T00:00:00.000Z", vote: "yes", voteRaw: "Yea", sourceUrl: "https://clerk.house.gov/evs/2025/roll160.xml", rawRef: "house/119/1/roll-00160/2026-11-16T05-00-00-000Z.json" };
CS.setVoteActionLinks(dw.pid, { [bk]: [roll] });
const both = CS.gapViewHtml(dw.pid, dw.key);
const notes = [...both.matchAll(/<tr class="pdxlg-xlr" data-pdxlg-xl="([^"]+)" data-pdxlg-xlrow="(\d+)">([\s\S]*?)<\/tr>/g)];
const matching = dw.rows.filter((p) => CS.voteActionBillKey(p.d) === bk).length;
eq(notes.length, matching, `both sides → one note per matching measure row (${dw.pid} × ${dw.key}, ${bk})`);
ok(notes.every((n) => n[1] === bk), "note names the shared bill key");
const n0 = notes[0]?.[3] || "";
ok(/Curator · also in the raw vote feed/.test(n0) && n0.includes(`<code>${bk}</code>`), "note says what it is and shows the key");
ok(n0.includes("House roll 160, 2025-06-12 — Yea"), "note names the roll call, date and recorded vote");
ok(n0.includes('href="https://clerk.house.gov/evs/2025/roll160.xml"') && n0.includes("official record"), "note links the official record");
ok(n0.includes(`<code>${roll.rawRef}</code>`), "note carries the stored-payload key");
// The note sits directly under its measure row.
const at = both.indexOf(`<tr data-pdxlg-row="${notes[0]?.[2]}">`);
const rowEnd = both.indexOf("</tr>", at) + 5;
ok(at >= 0 && both.slice(rowEnd).startsWith('<tr class="pdxlg-xlr"'), "note row follows its measure row");
// Removing the note leaves today's drawer exactly.
eq(both.replace(/<tr class="pdxlg-xlr"[\s\S]*?<\/tr>/g, ""), baseline, "with the note rows removed the drawer is byte-identical");
eq([...both.matchAll(/<tr data-pdxlg-row="/g)].length, [...baseline.matchAll(/<tr data-pdxlg-row="/g)].length, "no measure row added or dropped");

// One side only: raw rows on bills not in this drawer → identical markup.
CS.setVoteActionLinks(dw.pid, { "us-119-hr-999999": [roll] });
eq(CS.gapViewHtml(dw.pid, dw.key), baseline, "raw rows only (no matching curated measure) → byte-identical drawer");
CS.setVoteActionLinks(dw.pid, {});
eq(CS.gapViewHtml(dw.pid, dw.key), baseline, "empty raw set → byte-identical drawer");
CS.setVoteActionLinks(dw.pid, null);
eq(CS.gapViewHtml(dw.pid, dw.key), baseline, "curated only (nothing loaded) → byte-identical drawer");
// Every other drawer is untouched while one person has links loaded.
CS.setVoteActionLinks(dw.pid, { [bk]: [roll] });
const fresh = boot().PDXConsistency;
let others = 0, diff = 0;
for (const x of drawers.slice(0, 120)) {
  if (x.pid === dw.pid) continue;
  others++;
  if (CS.gapViewHtml(x.pid, x.key) !== fresh.gapViewHtml(x.pid, x.key)) diff++;
}
ok(others > 50 && diff === 0, `other people's drawers unchanged (${others} checked, ${diff} differ)`);
CS.setVoteActionLinks(dw.pid, null);
// Escaping: a hostile value cannot break out of the note.
CS.setVoteActionLinks(dw.pid, { [bk]: [{ ...roll, voteRaw: "<img src=x onerror=1>", sourceUrl: "javascript:alert(1)", rawRef: "</code><script>" }] });
const hostile = CS.gapViewHtml(dw.pid, dw.key);
ok(!/<img src=x|<script>|javascript:alert/.test(hostile), "note escapes values and links only http(s) sources");
CS.setVoteActionLinks(dw.pid, null);

// ── 4 · only the curator's session fetches ──────────────────────────────────
const src = R("consistency.js");
const xl = src.slice(src.indexOf("CURATOR-ONLY CROSS-LINK"), src.indexOf("function _dosLedgerHtml"));
ok(/_XL_CURATORS\.indexOf\(u\.email\.toLowerCase\(\)\)/.test(xl) && /!u\.isAnonymous/.test(xl), "fetch is gated on a non-anonymous curator account");
ok(/if \(!pid \|\| _xlAsked\[pid\] \|\| !_xlCurator\(\)/.test(xl), "no curator → no request");
ok((src.match(/['"]\/api\/admin\//g) || []).length === 1 && xl.includes("'/api/admin/vote-actions/cross-links'"), "the drawer calls only the curator endpoint, in this one place");
const og = src.slice(src.indexOf("function openGap(pid, issueKey, opts)"));
ok(/body\.innerHTML = html;\s*\/\/ Curator only[\s\S]{0,200}_xlEnsure\(pid, function \(\)/.test(og.slice(0, 2000)), "openGap asks the loader right after painting, with a repaint of the open sheet");
async function sessionFetches(user) {
  const w = boot();
  const seen = [];
  w.fetch = async (u, o) => { seen.push({ u: String(u), auth: o?.headers?.authorization || "" }); return { ok: true, json: async () => ({ billKeys: { [bk]: [roll] } }) }; };
  w.PDXAuth = { state: user ? "in" : "out", user };
  // openGap needs a live DOM sheet (the sandbox's is a stub), so this drives the
  // loader openGap calls (pinned above) and reads the result through the drawer.
  let repainted = 0;
  try { await w.PDXConsistency.loadVoteActionLinks(dw.pid, () => { repainted++; }); } catch { /* none */ }
  await new Promise((r) => setTimeout(r, 20));
  if (user && repainted !== (seen.length ? 1 : 0)) failures.push("repaint callback not called exactly once after a load");
  return { seen, html: w.PDXConsistency.gapViewHtml(dw.pid, dw.key) };
}
const guest = await sessionFetches(null);
eq(guest.seen.length, 0, "signed-out reader: no request");
eq(guest.html, baseline, "signed-out reader: drawer unchanged");
const member = await sessionFetches({ email: "someone@example.com", isAnonymous: false, getIdToken: async () => "t" });
eq(member.seen.length, 0, "signed-in non-curator: no request");
const anon = await sessionFetches({ email: "cdeluxxe@gmail.com", isAnonymous: true, getIdToken: async () => "t" });
eq(anon.seen.length, 0, "anonymous session: no request");
const curator = await sessionFetches({ email: "CDeluxxe@gmail.com", isAnonymous: false, getIdToken: async () => "tok" });
eq(curator.seen.map((s) => [s.u, s.auth]), [[`/api/admin/vote-actions/cross-links?pid=${encodeURIComponent(dw.pid)}`, "Bearer tok"]], "curator: one request with the ID token");
ok(/pdxlg-xlr/.test(curator.html), "curator: the drawer shows the cross-link once loaded");

// ── 5 · the endpoint ─────────────────────────────────────────────────────────
const stub = {
  name: "stub",
  setup(b) {
    b.onResolve({ filter: /admin-auth\.mjs$/ }, () => ({ path: "admin", namespace: "stub" }));
    b.onResolve({ filter: /vote-actions-db\.js$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
      loader: "js",
      contents: a.path === "admin" ? "export const requireAdmin = async () => globalThis.__admin;"
        : "export const voteActionsForPolitician = async (pid) => { globalThis.__asked = pid; return JSON.parse(JSON.stringify(globalThis.__rows)); };",
    }));
  },
};
const EP = await build("netlify/functions/vote-actions-cross-links.mts", "ep", [stub]);
globalThis.__rows = [
  { billKey: "us-119-hr-5000", chamber: "house", congress: 119, session: 2, rollNumber: 300, voteDate: "2026-11-12T19:00:00.000Z", vote: "yes", voteRaw: "Yea", voteKind: "passage", question: "On Passage", sourceUrl: "https://clerk.house.gov/evs/2026/roll300.xml", sourceLabel: "Clerk", rawRef: "house/119/2/roll-00300/x.json" },
  { billKey: "us-119-hr-5000", chamber: "house", congress: 119, session: 2, rollNumber: 310, voteDate: "2026-11-13T19:00:00.000Z", vote: "no", voteRaw: "Nay", voteKind: "motion", question: "On Motion to Recommit", sourceUrl: "https://clerk.house.gov/evs/2026/roll310.xml", sourceLabel: "Clerk", rawRef: null },
  { billKey: "us-119-hamdt-90", chamber: "house", congress: 119, session: 2, rollNumber: 301, voteDate: "2026-11-13T20:00:00.000Z", vote: "no", voteRaw: "Nay", voteKind: "amendment", question: null, sourceUrl: "https://clerk.house.gov/evs/2026/roll301.xml", sourceLabel: "Clerk", rawRef: "house/119/2/roll-00301/x.json" },
];
globalThis.__admin = { ok: true };
const res = await EP.default(new Request("https://x/api/admin/vote-actions/cross-links?pid=robert_aderholt"));
const body = await res.json();
eq([res.status, globalThis.__asked, body.pid, body.bills], [200, "robert_aderholt", "robert_aderholt", 2], "curator: rows for that politician, grouped by bill key");
eq(body.billKeys["us-119-hr-5000"].map((r) => [r.roll, r.vote, r.rawRef]), [[300, "yes", "house/119/2/roll-00300/x.json"], [310, "no", null]], "rolls kept in order with vote and raw key");
eq(res.headers.get("cache-control"), "private, no-store", "never cached");
eq((await EP.default(new Request("https://x/api/admin/vote-actions/cross-links?pid=bad%20id%3B"))).status, 400, "malformed pid → 400");
globalThis.__admin = { ok: false, status: 401 };
const denied = await EP.default(new Request("https://x/api/admin/vote-actions/cross-links?pid=robert_aderholt"));
const deniedBody = await denied.json();
ok(denied.status === 401 && !("billKeys" in deniedBody), "non-curator → 401, no rows");
eq([EP.config.path, JSON.stringify(EP.config.method)], ["/api/admin/vote-actions/cross-links", '["GET"]'], "GET-only admin path");
const dbSrc = R("netlify/lib/vote-actions-db.ts");
const fnSrc = dbSrc.slice(dbSrc.indexOf("export async function voteActionsForPolitician"));
ok(/\.from\(pdxVoteActions\)/.test(fnSrc) && !/\.(insert|update|delete)\(/.test(fnSrc) && !/vr[A-Z_]/.test(fnSrc), "the read is pdx_vote_actions only, read-only");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ vote-actions cross-links: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ vote-actions cross-links: ${passed} checks passed`);
