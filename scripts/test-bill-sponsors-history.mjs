#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-sponsors-history.mjs — every bill page says who wrote it and what
// happened to it, from the official record; person files list the same bills
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. EVERY BILL PAGE HAS THE RECORD. Each /b/ document carries a status, an
//      origin (chamber, sitting, date introduced), a sponsor block and a
//      history, and the edge prints them — status FIRST, above the number.
//   2. THE HISTORY IS THE RECORD. Each row is one action in db/bill-record.json
//      (same date, the record's own text, verbatim), oldest first; the only
//      other row is the dated "sitting ended" line on a measure that died with
//      its sitting. The status is re-derived here from the record's actions.
//   3. FAILED IS FAILED. A failed measure's label starts "Failed —" and carries
//      no word that reads as law; it has no law or signature row; it sits in
//      the Failed group on every person file. An enacted measure has a law or
//      signature row on the record. The three Utah 2026GS data-center bills
//      (H.B. 585, S.B. 282, S.B. 318) have pages and are failed.
//   4. SPONSOR LINKS POINT AT THE RIGHT PERSON. Every linked id is in the
//      roster, has a recorded vote (the federal vote roster, or a Utah formal
//      record), and is the person the record names: the same bioguide for
//      Congress, the same surname and session roll-call name for Utah. Nobody
//      the record does not name is linked; everyone else is counted.
//   5. BOTH WAYS. person-bills.json is the bill pages' sponsor table turned
//      around — every row links to a bill page that links back with the same
//      role — and person-bills.js renders exactly those rows, by status.
//   6. NOTHING ELSE MOVED. The record adds its fields and changes no mapping,
//      effect line or title; the new migration adds three vr_measures rows and
//      no mapping, roll call, vote or position.
//   7. MUTATIONS ARE CAUGHT: a failed bill losing its label, a failed bill
//      relabelled enacted, a sponsor link moved to another person, a new
//      mapping on a bill, and a vote or mapping row in the migration.
//
//   node scripts/test-bill-sponsors-history.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { billDocs, personBills } from "./gen-bill-docs.mjs";
import { deriveStatus, statusLabel, groupOf, FAILED_WORDS, SITTING_ENDED, rosterTables } from "./bill-record-core.mjs";
import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill sponsors/history: STALE HARNESS — ${m}`); process.exit(2); };

const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PEOPLE_FILE = JSON.parse(R("person-bills.json"));
const SHARE = JSON.parse(R("db/share-index.json"));
const FED_MAP = JSON.parse(R("db/vr-member-map.json")).map;
const FED_VOTERS = new Set(Object.values(FED_MAP));
const T = rosterTables(ROOT);
const FORMAL = (() => {
  const src = R("formal-index.js");
  const a = src.indexOf("var COUNTS = {");
  must(a !== -1, "formal-index.js carries COUNTS");
  return vm.runInNewContext("(" + src.slice(a + "var COUNTS = ".length, src.indexOf("};", a) + 1) + ")");
})();
const UTAH_NEW = ["2026GS|H.B. 585", "2026GS|S.B. 282", "2026GS|S.B. 318"];
const isUtah = (s) => /GS$/.test(s);
const RECORD_FIELDS = ["st", "sl", "o", "sp", "su", "h", "rs"];
const LAW_ROWS = /^(Became law|Signed by the President|Signed by the Governor)$/;

must(Object.keys(DOCS).length >= 540, `db/bill-docs.json holds every bill document (${Object.keys(DOCS).length})`);

// ── The checks, as functions, so section 7 can run them on mutated copies ────
function checkStatus(docs) {
  const bad = [];
  for (const [k, d] of Object.entries(docs)) {
    const rec = RECORDS[k];
    if (!rec) { bad.push(`${k}: no record`); continue; }
    const want = deriveStatus(d.s, d.n, rec);
    if (d.st !== want.st) bad.push(`${k}: status ${d.st} is not the record's ${want.st}`);
    if (d.sl !== statusLabel(want.st, want.why, d.s)) bad.push(`${k}: label "${d.sl}" is not the record's`);
    const g = groupOf(d.st);
    if (g === "failed") {
      if (!/^Failed — /.test(d.sl || "")) bad.push(`${k}: a failed measure is not labelled "Failed —"`);
      if (FAILED_WORDS.test(String(d.sl || "").replace(/^Failed — /, ""))) bad.push(`${k}: a failed label reads as law: "${d.sl}"`);
      if ((d.h || []).some((x) => LAW_ROWS.test(x.a))) bad.push(`${k}: a failed measure has a law or signature row`);
    }
    if (d.st === "enacted" && !(d.h || []).some((x) => LAW_ROWS.test(x.a)) && !(rec.a || []).some((x) => x.s === "override_passed"))
      bad.push(`${k}: enacted with no law or signature row on the record`);
    if (d.st !== "enacted" && /^Enacted/.test(d.sl || "")) bad.push(`${k}: a measure not enacted is labelled Enacted`);
  }
  return bad;
}

function checkSponsors(docs) {
  const bad = [];
  for (const [k, d] of Object.entries(docs)) {
    const rec = RECORDS[k] || { sp: [] };
    const roles = { s: "sponsor", f: "floor_sponsor", c: "cosponsor" };
    let linked = 0;
    for (const [r, list] of Object.entries(d.sp || {})) {
      for (const pid of list) {
        linked++;
        if (!SHARE.people[pid]) { bad.push(`${k}: ${pid} is not in the roster`); continue; }
        const named = rec.sp.filter((p) => p.r === roles[r]);
        if (isUtah(d.s)) {
          if (!FORMAL[pid] || !FORMAL[pid][0]) bad.push(`${k}: ${pid} has no recorded vote`);
          const last = String(SHARE.people[pid].n).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "");
          const hit = named.some((p) => {
            const m = /^(?:Rep\.|Sen\.)\s*([^,]+),/.exec(p.n);
            const sur = m ? m[1].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "") : "";
            if (!sur || !last.endsWith(sur.replace(/ /g, "")) && !last.split(" ").includes(sur) && !last.replace(/ /g, "").endsWith(sur.replace(/ /g, ""))) return false;
            const table = (T.utah[d.s] || T.utah["2025GS"] || {})[p.h] || {};
            return Object.entries(table).some(([key, v]) => T.canon(v) === pid && key.split(",")[0].trim().toLowerCase() === m[1].trim().toLowerCase());
          });
          if (!hit) bad.push(`${k}: ${pid} is not the ${roles[r]} the record names`);
        } else {
          if (!FED_VOTERS.has(pid) && !Object.values(FED_MAP).some((v) => T.canon(v) === pid)) bad.push(`${k}: ${pid} has no recorded vote`);
          if (!named.some((p) => p.id && T.canon(FED_MAP[p.id] || "") === pid)) bad.push(`${k}: ${pid} is not the ${roles[r]} the record names`);
        }
      }
    }
    const counted = Object.values(d.su || {}).reduce((a, b) => a + b, 0);
    if (linked + counted !== rec.sp.length) bad.push(`${k}: ${linked} linked + ${counted} counted ≠ ${rec.sp.length} the record lists`);
  }
  return bad;
}

function checkBothWays(docs, file) {
  const bad = [];
  const want = personBills(docs);
  if (JSON.stringify(want.bills) !== JSON.stringify(file.bills) || JSON.stringify(want.people) !== JSON.stringify(file.people))
    bad.push("person-bills.json is not the bill pages' sponsor table turned around");
  for (const [pid, refs] of Object.entries(file.people || {})) {
    for (const [i, r] of refs) {
      const b = file.bills[i];
      const d = b && docs[`${b[0]}|${b[1]}`];
      if (!d) { bad.push(`${pid}: row ${i} names no bill page`); continue; }
      if (!((d.sp || {})[r] || []).includes(pid)) bad.push(`${pid}: ${b[1]} (${b[0]}) does not link back as ${r}`);
      if (b[3] !== d.st || b[5] !== d.sl || b[4] !== groupOf(d.st)) bad.push(`${pid}: ${b[1]} carries another status than its page`);
    }
  }
  for (const d of Object.values(docs)) {
    for (const [r, list] of Object.entries(d.sp || {})) for (const pid of list) {
      const refs = (file.people || {})[pid] || [];
      if (!refs.some(([i, rr]) => rr === r && file.bills[i] && file.bills[i][0] === d.s && file.bills[i][1] === d.n))
        bad.push(`${d.s} ${d.n}: ${pid} (${r}) is not on that person's file`);
    }
  }
  return bad;
}

function checkNothingElse(docs) {
  const bad = [];
  const bare = billDocs(ROOT, { records: {} });
  for (const [k, d] of Object.entries(docs)) {
    const x = { ...d };
    for (const f of RECORD_FIELDS) delete x[f];
    if (JSON.stringify(x) !== JSON.stringify(bare[k])) bad.push(`${k}: the record pass changed a field it does not own`);
  }
  for (const k of UTAH_NEW) if (docs[k] && docs[k].m) bad.push(`${k}: a failed data-center bill was given an issue mapping`);
  return bad;
}

const MIGRATION = "netlify/database/migrations/20261119000000_vr_utah_2026gs_failed_datacenter_bills.sql";
function checkMigration(src) {
  const bad = [];
  const code = String(src).replace(/^\s*--.*$/gm, "");
  if (/\b(vr_measure_issues|vr_rollcalls|vr_member_votes|vr_positions|vr_measure_actions|vr_vote_correction_overlays)\b/i.test(code))
    bad.push("the migration writes a mapping, roll call, vote, position or action");
  if (/\b(UPDATE|DELETE)\b/i.test(code)) bad.push("the migration updates or deletes a row");
  const inserts = code.match(/INSERT INTO vr_measures\b/gi) || [];
  if (inserts.length !== 3) bad.push(`the migration inserts ${inserts.length} vr_measures rows, not 3`);
  for (const n of ["H.B. 585", "S.B. 282", "S.B. 318"]) if (!code.includes(`'${n}'`) || !/'failed'/.test(code)) bad.push(`${n} is not filed as failed`);
  return bad;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every bill page has the record");
// ═════════════════════════════════════════════════════════════════════════════
const published = measureAddresses(ROOT).published;
eq(published.length, Object.keys(DOCS).length, "one bill document per published address");
for (const a of published) {
  const k = `${a.sitting}|${a.number}`;
  const d = DOCS[k];
  ok(d && d.st && d.sl, `${k} has a status`);
  ok(d && d.o && /^(house|senate)$/.test(d.o.c) && /^\d{4}-\d{2}-\d{2}$/.test(d.o.d), `${k} has an origin (chamber and date introduced)`);
  ok(d && Array.isArray(d.h) && d.h.length > 0, `${k} has a history`);
  ok(d && /^https:\/\/(www\.congress\.gov|le\.utah\.gov)\//.test(d.rs || ""), `${k} names its official record page`);
  ok(d && (d.sp || d.su || /—|^PN/.test(d.n)), `${k} has a sponsor block (or is a nomination)`);
}
for (const k of UTAH_NEW) ok(!!DOCS[k], `${k} has a bill page`);

// Render every page through the edge, with no network.
const outDir = mkdtempSync(join(tmpdir(), "bill-sph-"));
execFileSync(join(ROOT, "node_modules/.bin/esbuild"),
  [join(ROOT, "netlify/edge-functions/share-preview.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${join(outDir, "sp.mjs")}`, "--log-level=error"],
  { stdio: ["ignore", "ignore", "inherit"] });
const EDGE = (await import(join(outDir, "sp.mjs"))).default;
const BILL_HTML = R("bill.html");
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("offline"); };
const seamRe = /<!--pdx:bill-doc-->([\s\S]*?)<!--\/pdx:bill-doc-->/;
const unesc = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const pages = {};
for (const [k, d] of Object.entries(DOCS)) {
  const p = billPath({ sitting: d.s, number: d.n });
  const ctx = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await EDGE(new Request("https://politidex.fyi" + p), ctx);
  pages[k] = ((await res.text()).match(seamRe) || [, ""])[1];
}
globalThis.fetch = realFetch;
let firstOk = 0, originOk = 0, histOk = 0, linkOk = 0, links = 0;
for (const [k, d] of Object.entries(DOCS)) {
  const html = pages[k];
  const inner = html.replace(/^<main[^>]*>/, "");
  if (inner.startsWith(`<p class="pdx-bill-status" data-pdx-bill-status="${d.st}"`) && inner.includes(`</span> ${d.sl.replace(/&/g, "&amp;")}</p>`)) firstOk++;
  else failures.push(`${k}: the status is not the first thing on the page`);
  if (/<p class="pdx-bill-origin"[^>]*>[\s\S]*?(Introduced|Received|Submitted) [A-Z][a-z]+\.? \d{1,2}, \d{4}<\/p>/.test(html)) originOk++;
  else failures.push(`${k}: the page prints no origin with a date`);
  const steps = [...html.matchAll(/<li data-pdx-bill-step>(?:<time datetime="([^"]+)">[^<]*<\/time> )?<b>([^<]*)<\/b>(?: <span class="pdx-bill-step-x">([^<]*)<\/span>)?<\/li>/g)];
  if (steps.length === d.h.length && steps.every((m, i) => m[1] === d.h[i].d && unesc(m[2]) === d.h[i].a && unesc(m[3] || "") === d.h[i].x)) histOk++;
  else failures.push(`${k}: the page's history is not the document's (${steps.length} vs ${d.h.length})`);
  const anchors = [...html.matchAll(/<a href="\/p\/([a-z0-9_]+)" data-pdx-bill-sponsor="([a-z0-9_]+)" data-role="(\w+)">([^<]*)<\/a>/g)];
  const want = Object.entries(d.sp || {}).flatMap(([r, l]) => l.map((pid) => ({ r: { s: "sponsor", f: "floor_sponsor", c: "cosponsor" }[r], pid })));
  links += want.length;
  if (anchors.length === want.length && want.every((w) => anchors.some((a) => a[1] === w.pid && a[2] === w.pid && a[3] === w.r && unesc(a[4]) === SHARE.people[w.pid].n))) linkOk += want.length;
  else failures.push(`${k}: the page's sponsor links are not the document's`);
}
eq(firstOk, Object.keys(DOCS).length, "every page leads with its status");
eq(originOk, Object.keys(DOCS).length, "every page prints its origin");
eq(histOk, Object.keys(DOCS).length, "every page prints its history row for row");
eq(linkOk, links, "every sponsor link on every page is an anchor to that person's file, under the roster's name");
console.log(`      ${Object.keys(DOCS).length} pages rendered · ${links} sponsor links`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the history is the record");
// ═════════════════════════════════════════════════════════════════════════════
let rowsChecked = 0, died = 0;
for (const [k, d] of Object.entries(DOCS)) {
  const rec = RECORDS[k];
  const acts = rec.a.filter((x) => d.h.some((h) => h.d === x.d && h.x === x.x));
  const extra = d.h.filter((h) => !rec.a.some((x) => x.d === h.d && x.x === h.x));
  ok(acts.length === rec.a.length, `${k}: a record action is missing from the history`);
  ok(extra.every((h) => h.a === "Died when the sitting ended" && h.d === SITTING_ENDED[d.s]), `${k}: the history has a row the record does not: ${JSON.stringify(extra[0])}`);
  died += extra.length;
  ok(d.h.every((h, i) => i === 0 || d.h[i - 1].d <= h.d), `${k}: the history is not oldest first`);
  ok(d.h.every((h) => h.a && /^\d{4}-\d{2}-\d{2}$/.test(h.d)), `${k}: a history row has no stage or date`);
  ok(!(SITTING_ENDED[d.s] && d.st === "pending"), `${k}: a measure in an ended sitting is pending`);
  rowsChecked += d.h.length;
}
ok(Object.values(DOCS).filter((d) => d.s === "119" && d.st === "pending").every((d) => !SITTING_ENDED[d.s]), "only the sitting 119th Congress has pending measures");
console.log(`      ${rowsChecked} history rows, ${died} "sitting ended" rows`);
const statusBad = checkStatus(DOCS);
eq(statusBad.length, 0, `every status is the record's, and failed reads as failed${statusBad.length ? ": " + statusBad.slice(0, 3).join("; ") : ""}`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · failed is failed");
// ═════════════════════════════════════════════════════════════════════════════
for (const k of UTAH_NEW) {
  const d = DOCS[k];
  eq(d && d.st, "failed", `${k} is failed`);
  ok(d && /^Failed — /.test(d.sl), `${k} is labelled failed`);
  ok(d && d.h.some((h) => h.a === "Filed without passage"), `${k}'s history ends with the Legislature's "filed" action`);
  ok(d && pages[k].includes('data-pdx-bill-group="failed"'), `${k}'s page marks it failed`);
}
eq(JSON.stringify(DOCS["2026GS|S.B. 282"].sp), JSON.stringify({ s: ["blouin_s13"] }), "S.B. 282's sponsor is Nate Blouin");
eq(JSON.stringify(DOCS["2026GS|H.B. 585"].sp), JSON.stringify({ s: ["rosalba_dominguez"] }), "H.B. 585's sponsor is Rosalba Dominguez");
const failedDocs = Object.values(DOCS).filter((d) => groupOf(d.st) === "failed");
ok(failedDocs.length > 100, `the archive holds failed measures (${failedDocs.length})`);
for (const d of failedDocs) {
  const body = pages[`${d.s}|${d.n}`].replace(/<section class="pdx-bill-history"[\s\S]*?<\/section>/, "");
  const statusLine = (body.match(/<p class="pdx-bill-status"[\s\S]*?<\/p>/) || [""])[0].replace(/<[^>]+>/g, " ");
  ok(!/\bEnacted\b|\bbecame law\b|\bsigned into law\b/i.test(statusLine), `${d.s} ${d.n}: a failed page's status line reads as law`);
}
const rows = Object.values(PEOPLE_FILE.people).flat().map(([i]) => PEOPLE_FILE.bills[i]);
ok(rows.filter((b) => b[3] === "failed" || b[3] === "vetoed").every((b) => b[4] === "failed" && /^Failed — /.test(b[5])), "every failed bill on a person file is in Failed, labelled failed");
ok(rows.filter((b) => b[4] === "enacted").every((b) => b[3] === "enacted"), "only an enacted bill is in Enacted on a person file");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · sponsor links point at the right person");
// ═════════════════════════════════════════════════════════════════════════════
const spBad = checkSponsors(DOCS);
eq(spBad.length, 0, `every link is the person the record names, in the roster, with a recorded vote${spBad.length ? ": " + spBad.slice(0, 3).join("; ") : ""}`);
eq(DOCS["117|H.R. 3684"].sp && DOCS["117|H.R. 3684"].sp.s, undefined, "a sponsor not on the roster (Rep. DeFazio, H.R. 3684) is not linked");
eq(DOCS["117|H.R. 3684"].su && DOCS["117|H.R. 3684"].su.s, 1, "…and is counted");
ok(!pages["117|H.R. 3684"].includes("DeFazio"), "…and is not named");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · both ways");
// ═════════════════════════════════════════════════════════════════════════════
const bwBad = checkBothWays(DOCS, PEOPLE_FILE);
eq(bwBad.length, 0, `the person-file lists are the sponsor tables, both ways${bwBad.length ? ": " + bwBad.slice(0, 3).join("; ") : ""}`);
// person-bills.js renders those rows, each a link to the bill page, by status.
{
  const sandbox = { window: {}, document: { readyState: "complete", getElementById: () => null, querySelector: () => null, body: null }, fetch: async () => ({ ok: false }) };
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(R("person-bills.js"), Object.assign(sandbox, { window: sandbox.window }), { filename: "person-bills.js" });
  const PB = sandbox.window.PDXPersonBills;
  must(PB && typeof PB.html === "function", "person-bills.js exposes PDXPersonBills");
  let rendered = 0;
  for (const pid of ["blouin_s13", "rosalba_dominguez", Object.keys(PEOPLE_FILE.people)[0]]) {
    const list = PB.rowsFor(PEOPLE_FILE, pid);
    const html = PB.html(list);
    const hrefs = [...html.matchAll(/<a href="([^"]+)" data-pdx-sponsored-bill="([^"]+)">/g)];
    eq(hrefs.length, PEOPLE_FILE.people[pid].length, `${pid}'s file lists every bill they are on`);
    for (const [, href, key] of hrefs) {
      const d = DOCS[key];
      ok(d && href === billPath({ sitting: d.s, number: d.n }), `${pid}: ${key} links to its bill page`);
      ok(d && Object.values(d.sp || {}).some((l) => l.includes(pid)), `${pid}: ${key}'s page links back`);
      rendered++;
    }
    const groups = [...html.matchAll(/data-pdx-sponsored-group="(\w+)"/g)].map((m) => m[1]);
    ok(groups.every((g, i) => i === 0 || ["enacted", "passed", "failed", "pending"].indexOf(groups[i - 1]) < ["enacted", "passed", "failed", "pending"].indexOf(g)), `${pid}'s file is split by status in order`);
  }
  const blouin = PB.html(PB.rowsFor(PEOPLE_FILE, "blouin_s13"));
  const failedBlock = (blouin.match(/data-pdx-sponsored-group="failed"[\s\S]*?<\/ul>/) || [""])[0];
  ok(failedBlock.includes('data-pdx-sponsored-bill="2026GS|S.B. 282"') && failedBlock.includes('data-pdx-sponsored-bill="2026GS|S.B. 318"'), "Nate Blouin's file lists S.B. 282 and S.B. 318 under Failed");
  ok(!/data-pdx-sponsored-group="enacted"[\s\S]*?2026GS\|S\.B\. 282/.test(blouin.split('data-pdx-sponsored-group="failed"')[0]), "…and not under Enacted");
  console.log(`      ${rendered} person-file rows rendered and followed`);
}
ok(R("person.html").includes('<script defer src="/person-bills.js"></script>'), "person.html loads person-bills.js");
ok(R("sw.js").includes("'/person-bills.js',"), "person-bills.js is on the shell");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
const neBad = checkNothingElse(DOCS);
eq(neBad.length, 0, `the record adds its fields and changes no other${neBad.length ? ": " + neBad.slice(0, 3).join("; ") : ""}`);
const mgBad = checkMigration(R(MIGRATION));
eq(mgBad.length, 0, `the migration adds three bill rows and nothing else${mgBad.length ? ": " + mgBad.join("; ") : ""}`);
for (const n of ["H.B. 585", "S.B. 282", "S.B. 318"]) ok(!new RegExp(`${n.replace(/\./g, "\\.")}\\|2026GS`).test(R("consistency.js")), `no effect line is stored for ${n}`);
let fresh = true;
try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "ignore" }); } catch (e) { fresh = false; }
ok(fresh, "db/bill-docs.json and person-bills.json are current");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
const clone = () => JSON.parse(JSON.stringify(DOCS));
const caught = (name, bad) => { ok(bad.length > 0, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad.length ? "caught" : "MISSED"}`); };
{ const m = clone(); delete m["2026GS|S.B. 282"].sl; caught("a failed bill loses its status label", checkStatus(m)); }
{ const m = clone(); m["2026GS|H.B. 585"].st = "enacted"; m["2026GS|H.B. 585"].sl = "Enacted — signed into law"; caught("a failed bill relabelled enacted", checkStatus(m)); }
{ const m = clone(); m["2026GS|S.B. 318"].sl = "Failed — signed into law later"; caught("a failed label that reads as law", checkStatus(m)); }
{ const m = clone(); const d = m["117|H.R. 5746"]; d.h.push({ d: "2022-12-31", a: "Became law", x: "Became Public Law No: 117-999." }); caught("a law row on a failed bill", checkStatus(m)); }
{ const m = clone(); m["2026GS|S.B. 282"].sp = { s: ["rosalba_dominguez"] }; caught("a Utah sponsor link pointed at another person", checkSponsors(m)); }
{
  const m = clone();
  const k = Object.keys(m).find((x) => !isUtah(m[x].s) && m[x].sp && m[x].sp.c && m[x].sp.c.length > 1);
  const other = Object.values(FED_MAP).find((p) => !Object.values(m[k].sp).flat().includes(p) && SHARE.people[p]);
  m[k].sp.c[0] = other;
  caught("a federal co-sponsor link pointed at another person", checkSponsors(m));
}
{ const m = clone(); m["2026GS|H.B. 585"].sp = { s: ["rosalba_dominguez"], c: ["blouin_s13"] }; caught("a person the record does not name linked", checkSponsors(m)); }
{ const m = clone(); m["2026GS|S.B. 282"].m = [{ i: "Data Centers", k: "datacenter_growth" }]; caught("a new issue mapping on a bill", checkNothingElse(m)); }
{ const m = clone(); const k = Object.keys(m).find((x) => m[x].m && m[x].m.some((y) => y.l)); m[k].m.find((y) => y.l).l = "A different effect line."; caught("an effect line changed", checkNothingElse(m)); }
{ const m = clone(); const d = m["2026GS|S.B. 282"]; d.sp = {}; caught("a person-file row with no bill page link back", checkBothWays(m, PEOPLE_FILE)); }
caught("a member vote added in the migration", checkMigration(R(MIGRATION) + "\nINSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES (1, 'blouin_s13', 'yea');"));
caught("a mapping added in the migration", checkMigration(R(MIGRATION) + "\nINSERT INTO vr_measure_issues (measure_id, issue_key) VALUES (1, 'datacenter_growth');"));
caught("a status rewritten in the migration", checkMigration(R(MIGRATION).replace(/'failed'/g, "'enacted'") + "\nUPDATE vr_measures SET status = 'enacted';"));

if (failures.length) {
  console.error(`\n✗ bill sponsors/history: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures.slice(0, 40)) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ bill sponsors/history: every bill page leads with its status, names its sponsors and its record — ${passed} assertions passed`);
