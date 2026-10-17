#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-utah-datacenter-pages.mjs — the three failed 2026GS data-center bills
// carry the same origin, sponsor and history blocks as every other bill page
// ─────────────────────────────────────────────────────────────────────────────
// H.B. 585, S.B. 282 and S.B. 318 were filed as rows in 20261119000000 and read
// from le.utah.gov by scripts/fetch-bill-record.mjs with the other 537. This
// holds the three to the record, rendered through the edge exactly as served:
//
//   1. EACH PAGE HAS THE BLOCKS. Status first (Failed), then the origin line
//      (Utah House/Senate · 2026 General Session · Introduced <date>), the
//      sponsor block and the history block with the record link.
//   2. THE SPONSORS ARE THE RECORD'S. Each linked person is the prime sponsor
//      le.utah.gov names (the record names no co-sponsor or floor sponsor for
//      these three, and the page prints none); each link is /p/<pid> to a
//      roster file, and the bill is in that person's "Bills sponsored" list,
//      under Failed.
//   3. THE HISTORY IS THE RECORD'S. Every row is one action in
//      db/bill-record.json, with its date and its text verbatim, oldest first.
//   4. NO OTHER BILL PAGE CHANGED: db/bill-docs.json, person-bills.json and
//      bill-search-index.js are current and identical to the committed copies,
//      and the three stay in the eye's index.
//   5. MUTATIONS ARE CAUGHT: an invented sponsor, an invented co-sponsor, a
//      history action the record does not hold, a date moved, a bill missing
//      from its sponsor's list.
//
//   node scripts/test-utah-datacenter-pages.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ utah data-center pages: STALE HARNESS — ${m}`); process.exit(2); };

const THREE = [
  { k: "2026GS|H.B. 585", path: "/b/2026GS/H.B.%20585", ch: "Utah House", sponsor: "rosalba_dominguez", named: "Rep. Dominguez, Rosalba" },
  { k: "2026GS|S.B. 282", path: "/b/2026GS/S.B.%20282", ch: "Utah Senate", sponsor: "blouin_s13", named: "Sen. Blouin, Nate" },
  { k: "2026GS|S.B. 318", path: "/b/2026GS/S.B.%20318", ch: "Utah Senate", sponsor: "blouin_s13", named: "Sen. Blouin, Nate" },
];
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const PB = JSON.parse(R("person-bills.json"));
const PEOPLE = JSON.parse(R("db/share-index.json")).people;
for (const t of THREE) must(DOCS[t.k] && RECORDS[t.k], `${t.k} has a bill document and an official record`);

// Render through the edge, offline, the way test-bill-sponsors-history.mjs does.
const outDir = mkdtempSync(join(tmpdir(), "ut-dc-"));
execFileSync(join(ROOT, "node_modules/.bin/esbuild"),
  [join(ROOT, "netlify/edge-functions/share-preview.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${join(outDir, "sp.mjs")}`, "--log-level=error"],
  { stdio: ["ignore", "ignore", "inherit"] });
const EDGE = (await import(join(outDir, "sp.mjs"))).default;
const BILL = R("bill.html");
const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("offline"); };
const seams = {};
for (const t of THREE) {
  const res = await EDGE(new Request("https://politidex.fyi" + t.path),
    { next: async () => new Response(BILL, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) });
  seams[t.k] = { status: res.status, html: ((await res.text()).match(/<!--pdx:bill-doc-->([\s\S]*?)<!--\/pdx:bill-doc-->/) || [, ""])[1] };
}
globalThis.fetch = realFetch;
const unesc = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const MON = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const dayText = (iso) => { const [y, m, d] = iso.split("-"); return `${MON[Number(m) - 1]} ${Number(d)}, ${y}`; };

// ── the checks, as functions so section 5 can run them on mutated copies ─────
const ROLE = { s: "sponsor", f: "floor_sponsor", c: "cosponsor" };
function sponsorBad(doc, rec) {
  const bad = [];
  for (const [r, list] of Object.entries(doc.sp || {})) {
    for (const pid of list) {
      if (!PEOPLE[pid]) { bad.push(`${pid} is not a roster file`); continue; }
      const named = rec.sp.filter((p) => p.r === ROLE[r]);
      const sur = (p) => (/^(?:Rep\.|Sen\.)\s*([^,]+),/.exec(p.n) || [, ""])[1].toLowerCase();
      if (!named.some((p) => sur(p) && PEOPLE[pid].n.toLowerCase().includes(sur(p)))) bad.push(`${pid} is not a ${ROLE[r]} the record names`);
    }
  }
  const linked = Object.values(doc.sp || {}).flat().length + Object.values(doc.su || {}).reduce((a, b) => a + b, 0);
  if (linked !== rec.sp.length) bad.push(`${linked} sponsors on the page, ${rec.sp.length} on the record`);
  return bad;
}
function historyBad(doc, rec) {
  const bad = [];
  for (const h of doc.h || []) {
    if (!rec.a.some((a) => a.d === h.d && a.x === h.x)) bad.push(`"${h.a}" on ${h.d} is not an action on the record`);
  }
  if ((doc.h || []).length !== rec.a.length) bad.push(`${(doc.h || []).length} history rows, ${rec.a.length} record actions`);
  if (!(doc.h || []).every((h, i, l) => i === 0 || l[i - 1].d <= h.d)) bad.push("the history is not oldest first");
  return bad;
}
function listedBad(pb, k, pid) {
  const refs = (pb.people || {})[pid] || [];
  const hit = refs.find(([i]) => pb.bills[i] && `${pb.bills[i][0]}|${pb.bills[i][1]}` === k);
  if (!hit) return [`${k} is not on ${pid}'s file`];
  return pb.bills[hit[0]][4] === "failed" ? [] : [`${k} is not under Failed on ${pid}'s file`];
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each page has the blocks");
// ═════════════════════════════════════════════════════════════════════════════
for (const t of THREE) {
  const { status, html } = seams[t.k];
  const d = DOCS[t.k];
  eq(status, 200, `${t.k} answers 200`);
  ok(html.replace(/^<main[^>]*>/, "").startsWith('<p class="pdx-bill-status" data-pdx-bill-status="failed" data-pdx-bill-group="failed">'), `${t.k} leads with Failed`);
  ok(/^Failed — /.test(d.sl) && html.includes(d.sl), `${t.k} prints its Failed label`);
  ok(html.includes(`<span class="pdx-bill-k">Origin</span> ${t.ch} · 2026 General Session · Introduced ${dayText(RECORDS[t.k].in)}</p>`),
    `${t.k}'s origin line is ${t.ch}, 2026 General Session, introduced ${RECORDS[t.k].in}`);
  ok(html.includes("data-pdx-bill-sponsors>"), `${t.k} has a sponsor block`);
  ok(html.includes("data-pdx-bill-history>"), `${t.k} has a history block`);
  ok(html.includes(`href="${RECORDS[t.k].src}"`) && /^https:\/\/le\.utah\.gov\/~2026\/bills\/static\//.test(RECORDS[t.k].src), `${t.k} links its le.utah.gov record`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the sponsors are the record's");
// ═════════════════════════════════════════════════════════════════════════════
for (const t of THREE) {
  const d = DOCS[t.k], rec = RECORDS[t.k], html = seams[t.k].html;
  eq(JSON.stringify(rec.sp.map((p) => [p.r, p.n])), JSON.stringify([["sponsor", t.named]]), `${t.k}: the record names one prime sponsor, ${t.named}, and no co-sponsor`);
  eq(JSON.stringify(d.sp), JSON.stringify({ s: [t.sponsor] }), `${t.k}: the page links ${t.sponsor} as sponsor and nobody else`);
  const bad = sponsorBad(d, rec);
  eq(bad.length, 0, `${t.k}: every sponsor link is the record's${bad.length ? ": " + bad.join("; ") : ""}`);
  const links = [...html.matchAll(/<a href="\/p\/([a-z0-9_]+)" data-pdx-bill-sponsor="([a-z0-9_]+)" data-role="(\w+)">([^<]*)<\/a>/g)];
  eq(links.length, 1, `${t.k} prints exactly one person link`);
  ok(links[0] && links[0][1] === t.sponsor && links[0][3] === "sponsor" && unesc(links[0][4]) === PEOPLE[t.sponsor].n, `${t.k}'s link is /p/${t.sponsor}, under the roster's name`);
  no(html, "data-role=\"cosponsor\"", `${t.k} prints no co-sponsor`);
  no(html, "data-role=\"floor_sponsor\"", `${t.k} prints no floor sponsor`);
  const lb = listedBad(PB, t.k, t.sponsor);
  eq(lb.length, 0, `${t.k} is under Failed in ${t.sponsor}'s Bills sponsored${lb.length ? ": " + lb.join("; ") : ""}`);
}
function no(h, n, m) { ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`); }

// person-bills.js renders the same rows on the person file.
{
  const sb = { window: {}, document: { readyState: "complete", getElementById: () => null, querySelector: () => null, body: null }, fetch: async () => ({ ok: false }) };
  vm.runInNewContext(R("person-bills.js"), sb, { filename: "person-bills.js" });
  const P = sb.window.PDXPersonBills;
  must(P && typeof P.html === "function", "person-bills.js exposes PDXPersonBills");
  for (const pid of ["rosalba_dominguez", "blouin_s13"]) {
    const html = P.html(P.rowsFor(PB, pid));
    const failed = (html.match(/data-pdx-sponsored-group="failed"[\s\S]*?<\/ul>/) || [""])[0];
    for (const t of THREE.filter((x) => x.sponsor === pid)) {
      ok(failed.includes(`<a href="${t.path}" data-pdx-sponsored-bill="${t.k}">`), `${pid}'s file lists ${t.k} under Failed, linked to its page`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the history is the record's");
// ═════════════════════════════════════════════════════════════════════════════
for (const t of THREE) {
  const d = DOCS[t.k], rec = RECORDS[t.k], html = seams[t.k].html;
  const bad = historyBad(d, rec);
  eq(bad.length, 0, `${t.k}: every history row is a record action${bad.length ? ": " + bad.join("; ") : ""}`);
  const steps = [...html.matchAll(/<li data-pdx-bill-step><time datetime="([^"]+)">[^<]*<\/time> <b>([^<]*)<\/b> <span class="pdx-bill-step-x">([^<]*)<\/span><\/li>/g)];
  ok(steps.length === rec.a.length && steps.every((m, i) => m[1] === rec.a[i].d && unesc(m[3]) === rec.a[i].x), `${t.k}'s page prints the record's actions row for row`);
  ok(rec.a[0].s === "introduced" && rec.a[rec.a.length - 1].s === "filed", `${t.k}'s history runs from introduction to the Legislature's "filed"`);
  ok(!d.h.some((h) => /Became law|Signed by|Passed the/.test(h.a)), `${t.k}'s history holds no passage or signature`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no other bill page changed");
// ═════════════════════════════════════════════════════════════════════════════
let fresh = true;
try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "ignore" }); } catch (e) { fresh = false; }
ok(fresh, "gen-bill-docs.mjs --check: the bill pages, person lists and the eye's index are current");
const gitShow = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { return null; } };
for (const f of ["db/bill-docs.json", "db/bill-record.json", "person-bills.json", "bill-search-index.js"]) {
  const head = gitShow(f);
  if (head === null) { console.log(`      (no git baseline for ${f})`); continue; }
  ok(head === R(f), `${f} changed`);
}
{
  const w = {};
  vm.runInNewContext(R("bill-search-index.js"), { window: w });
  for (const t of THREE) ok(w.PDX_BILL_SEARCH.some((r) => `${r[0]}|${r[1]}` === t.k), `${t.k} is in the eye's index`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
const clone = (x) => JSON.parse(JSON.stringify(x));
const caught = (name, bad) => { ok(bad.length > 0, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad.length ? "caught" : "MISSED"}`); };
{ const d = clone(DOCS["2026GS|S.B. 282"]); d.sp = { s: ["rosalba_dominguez"] }; caught("the sponsor swapped for another legislator", sponsorBad(d, RECORDS["2026GS|S.B. 282"])); }
{ const d = clone(DOCS["2026GS|H.B. 585"]); d.sp.c = ["blouin_s13"]; caught("an invented co-sponsor", sponsorBad(d, RECORDS["2026GS|H.B. 585"])); }
{ const d = clone(DOCS["2026GS|S.B. 318"]); d.sp = { s: ["blouin_s13"], f: ["rosalba_dominguez"] }; caught("an invented floor sponsor", sponsorBad(d, RECORDS["2026GS|S.B. 318"])); }
{ const d = clone(DOCS["2026GS|S.B. 318"]); d.h.splice(1, 0, { d: "2026-02-27", a: "Recommended by Senate committee", x: "Senate Comm - Favorable Recommendation" }); caught("a committee action the record does not hold", historyBad(d, RECORDS["2026GS|S.B. 318"])); }
{ const d = clone(DOCS["2026GS|H.B. 585"]); d.h.push({ d: "2026-03-06", a: "Passed the House", x: "House/ passed 3rd reading" }); caught("a floor passage the record does not hold", historyBad(d, RECORDS["2026GS|H.B. 585"])); }
{ const d = clone(DOCS["2026GS|S.B. 282"]); d.h[1].d = "2026-02-19"; caught("a history date moved", historyBad(d, RECORDS["2026GS|S.B. 282"])); }
{ const pb = clone(PB); pb.people.blouin_s13 = pb.people.blouin_s13.filter(([i]) => `${pb.bills[i][0]}|${pb.bills[i][1]}` !== "2026GS|S.B. 318"); caught("S.B. 318 missing from its sponsor's file", listedBad(pb, "2026GS|S.B. 318", "blouin_s13")); }

if (failures.length) {
  console.error(`\n✗ utah data-center pages: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures.slice(0, 30)) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ utah data-center pages: H.B. 585, S.B. 282 and S.B. 318 carry their record's origin, sponsor and history — ${passed} assertions passed`);
