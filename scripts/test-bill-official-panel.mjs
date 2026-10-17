#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-official-panel.mjs — every bill with an official record shows its
// origin, sponsors and history, on the page and in the panel over it
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. EVERY RECORD, EVERY BLOCK. Each bill with an entry in db/bill-record.json
//      has, in db/bill-docs.json AND bill-official.json, an origin, a history
//      and a record page — whether or not it has a roll call or an issue
//      mapping. bill-official.json is current (the generator's own --check).
//   2. THE FOUR. 2026GS H.B. 585, S.B. 282, S.B. 318 and H.B. 76 carry the
//      origin line, their real sponsor links and the history from the record,
//      on the page (db/bill-docs.json, which the edge prints) and in the bill panel — on the full panel with
//      no roll call and no mapping, and on the lite fallback.
//   3. SPONSORS ARE REAL. Every linked id is the sponsor resolution of the
//      record (resolveSponsors), names an existing person file in the share
//      index with the share index's own name, and the bill is in that
//      person's sponsored list (person-bills.json) with the same role.
//   4. HISTORY IS THE RECORD. Every history row is one action in
//      db/bill-record.json (same date, same text) or the dated "sitting ended"
//      line on a measure that died with its sitting. No other row.
//   5. HONEST EMPTIES. A record with no date prints an origin with no date; a
//      record whose sponsors are not on file prints a count and no link.
//   6. NOTHING ELSE MOVED. Every field the page already had is in the panel's
//      file unchanged; the record adds no mapping, effect line or title.
//   7. MUTATIONS ARE CAUGHT: an invented sponsor, an invented history action,
//      a dropped history block.
//
//   node scripts/test-bill-official-panel.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { billDocs, billOfficial } from "./gen-bill-docs.mjs";
import { resolveSponsors, rosterTables, deriveStatus, SITTING_ENDED } from "./bill-record-core.mjs";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);

const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const RECORDS = JSON.parse(R("db/bill-record.json")).records;
const OFFICIAL = JSON.parse(R("bill-official.json")).docs;
const SHARE = JSON.parse(R("db/share-index.json"));
const PB = JSON.parse(R("person-bills.json"));
const T = rosterTables(ROOT);
const FOUR = ["2026GS|H.B. 585", "2026GS|S.B. 282", "2026GS|S.B. 318", "2026GS|H.B. 76"];
const ROLE = { sponsor: "s", floor_sponsor: "f", cosponsor: "c" };

// ── the checker, shared with the mutations ──────────────────────────────────
// Returns the list of problems with one panel table against the record.
function audit(official) {
  const bad = [];
  for (const [key, rec] of Object.entries(RECORDS)) {
    const e = official[key];
    if (!e) { bad.push(`${key}: has a record and no panel entry`); continue; }
    const [sitting, number] = key.split("|");
    if (!e.o) bad.push(`${key}: no origin`);
    else if (e.o[0] !== (rec.ch || "") || e.o[1] !== (rec.in || "")) bad.push(`${key}: origin is not the record's`);
    if (!e.h || !e.h.length) bad.push(`${key}: no history`);
    if (e.rs !== rec.src) bad.push(`${key}: record page is not the record's`);
    // Sponsors: exactly the record's resolution, the share index's names.
    const want = resolveSponsors(T, sitting, rec).linked
      .filter((x) => SHARE.people[x.p] && SHARE.people[x.p].n)
      .map((x) => `${ROLE[x.r]}:${x.p}`);
    const got = (e.sp || []).map((x) => `${x[0]}:${x[1]}`);
    const wantSet = new Set(want);
    for (const g of got) if (!wantSet.has(g)) bad.push(`${key}: sponsor ${g} is not on the record`);
    for (const w of want) if (!got.includes(w)) bad.push(`${key}: record sponsor ${w} is missing`);
    for (const x of e.sp || []) {
      const who = SHARE.people[x[1]];
      if (!who || who.n !== x[2]) bad.push(`${key}: sponsor ${x[1]} has no person file under that name`);
    }
    // History: each row is a record action, or the dated sitting-ended line.
    const acts = new Set(((rec.a) || []).map((a) => `${a.d}|${a.x}`));
    const ended = SITTING_ENDED[sitting];
    const st = deriveStatus(sitting, number, rec).st;
    for (const h of e.h || []) {
      if (acts.has(`${h[0]}|${h[2]}`)) continue;
      if (ended && st === "failed" && h[0] === ended && /ended with no further action/.test(h[2])) continue;
      bad.push(`${key}: history row ${JSON.stringify(h)} is not an action on the record`);
    }
  }
  for (const key of Object.keys(official)) if (!RECORDS[key]) bad.push(`${key}: panel entry with no record`);
  return bad;
}

section("1. bill-official.json is current, and every record has every block");
{
  let fresh = true;
  try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "pipe" }); }
  catch (e) { fresh = false; }
  ok(fresh, "gen-bill-docs.mjs --check fails: a generated file is stale");
  const rebuilt = billOfficial(billDocs(ROOT), SHARE.people);
  ok(JSON.stringify(rebuilt) === JSON.stringify(OFFICIAL), "bill-official.json is not what the generator writes");
  for (const key of Object.keys(RECORDS)) {
    const d = DOCS[key];
    ok(!!d, `${key}: record with no bill page`);
    if (!d) continue;
    ok(!!d.o && Array.isArray(d.h) && d.h.length > 0 && !!d.rs, `${key}: the page lacks origin, history or record link`);
  }
  const bare = Object.keys(RECORDS).filter((k) => DOCS[k] && !DOCS[k].m);
  ok(bare.length > 0 && bare.every((k) => OFFICIAL[k] && OFFICIAL[k].h && OFFICIAL[k].o),
    "a bill with no issue mapping has no official-record blocks in the panel table");
}

section("2–4. sponsors and history are the record's — every entry");
{
  const bad = audit(OFFICIAL);
  ok(bad.length === 0, `the panel table disagrees with the record:\n      ${bad.slice(0, 8).join("\n      ")}`);
  // The page agrees with the panel, field for field.
  for (const [key, e] of Object.entries(OFFICIAL)) {
    const d = DOCS[key];
    const pageSp = ["s", "f", "c"].flatMap((r) => ((d.sp && d.sp[r]) || []).filter((p) => SHARE.people[p]).map((p) => `${r}:${p}`));
    ok(JSON.stringify(pageSp) === JSON.stringify((e.sp || []).map((x) => `${x[0]}:${x[1]}`)), `${key}: panel sponsors differ from the page's`);
    ok(JSON.stringify((d.h || []).map((x) => [x.d, x.a, x.x])) === JSON.stringify(e.h || []), `${key}: panel history differs from the page's`);
    ok(JSON.stringify(d.su || null) === JSON.stringify(e.su || null), `${key}: panel's count of others differs from the page's`);
  }
  // Both ways: each linked sponsor's file lists the bill, same role.
  for (const [key, e] of Object.entries(OFFICIAL)) {
    for (const [r, pid] of e.sp || []) {
      const rows = (PB.people[pid] || []).map(([i, role]) => `${PB.bills[i][0]}|${PB.bills[i][1]}|${role}`);
      ok(rows.includes(`${key}|${r}`), `${key}: ${pid} is linked as ${r} but the bill is not in their sponsored list`);
    }
  }
}

section("2. the four bills — the page entry and the panel");
{
  const expect = {
    "2026GS|H.B. 585": { origin: "Utah House · 2026 General Session · Introduced Feb. 18, 2026", sp: ["rosalba_dominguez"] },
    "2026GS|S.B. 282": { origin: "Utah Senate · 2026 General Session · Introduced Feb. 11, 2026", sp: ["blouin_s13"] },
    "2026GS|S.B. 318": { origin: "Utah Senate · 2026 General Session · Introduced Feb. 23, 2026", sp: ["blouin_s13"] },
    "2026GS|H.B. 76": { origin: "Utah House · 2026 General Session · Introduced Jan. 20, 2026", sp: ["koford_h10", "ssandall"] },
  };

  // Boot the shipped panel with the shipped table behind its fetch.
  function boot(src) {
    const win = makeSandbox();
    const cap = { innerHTML: "", scrollTop: 0 };
    // A tiny seam host: the panel fills [data-bd-official-seam] inside the scroll.
    cap.querySelector = (sel) => {
      if (sel === "[data-bd-official-seam]") return /data-bd-official-seam/.test(cap.innerHTML) ? {} : null;
      return null;
    };
    win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? cap : null);
    win.document.querySelector = (sel) => {
      if (sel === "#pdx-bd-scroll [data-bd-official-seam]") {
        const m = /<div class="bd-official-seam" data-bd-official-seam><\/div>/.exec(cap.innerHTML);
        if (!m) return null;
        return {
          childNodes: [],
          set innerHTML(h) { cap.innerHTML = cap.innerHTML.replace(m[0], `<div class="bd-official-seam" data-bd-official-seam>${h}</div>`); },
          querySelectorAll: () => [],
        };
      }
      return null;
    };
    win.history = { replaceState() {}, pushState() {} };
    win.fetch = (u) => /bill-official\.json$/.test(String(u))
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(R("bill-official.json"))) })
      : Promise.reject(new Error("no network"));
    const ctx = vm.createContext(win);
    for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "receipt-cards.js"]) {
      vm.runInContext(R(f), ctx, { filename: f });
    }
    vm.runInContext(src || R("bill-detail.js"), ctx, { filename: "bill-detail.js" });
    return { win, cap };
  }
  const settle = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };

  async function panelFor(key, lite, src) {
    const [sitting, number] = key.split("|");
    const d = DOCS[key];
    const { win, cap } = boot(src);
    const measure = { id: 7000 + number.length, number, congress: null, chamber: d.c, status: d.st, title: d.t, externalIds: { utahSession: sitting } };
    const card = { ...measure, issueKeys: [] };
    win.PDXBills = lite
      ? { get: () => Promise.reject(new Error("down")), list: () => Promise.resolve({ items: [card] }), listSync: () => ({ items: [card] }), isFollowed: () => false }
      : { get: () => Promise.resolve({ measure, issues: [], rollcalls: [], positions: [], provisions: [], actions: [] }),
          list: () => Promise.resolve({ items: [card] }), listSync: () => ({ items: [card] }), isFollowed: () => false };
    win.PDXBillDetail.open(lite ? number : measure.id, sitting);
    await settle();
    return cap.innerHTML;
  }

  for (const key of FOUR) {
    const e = OFFICIAL[key];
    const want = expect[key];
    ok(!!e, `${key}: no panel entry`);
    if (!e) continue;
    ok(JSON.stringify((e.sp || []).map((x) => x[1])) === JSON.stringify(want.sp), `${key}: sponsors are ${JSON.stringify((e.sp || []).map((x) => x[1]))}`);
    for (const pid of want.sp) ok(!!SHARE.people[pid], `${key}: ${pid} has no person file`);
    for (const lite of [false, true]) {
      const html = await panelFor(key, lite);
      const tag = `${key} (${lite ? "lite" : "full"} panel)`;
      ok(html.includes(`<span class="bd-off-k">Origin</span> ${want.origin}`), `${tag}: no origin line "${want.origin}"`);
      for (const pid of want.sp) ok(html.includes(`href="/p/${pid}"`) && html.includes(`data-bd-official-sponsor="${pid}"`), `${tag}: no sponsor link to /p/${pid}`);
      const steps = (html.match(/data-bd-official-step/g) || []).length;
      ok(steps === e.h.length, `${tag}: ${steps} history rows, the record has ${e.h.length}`);
      for (const h of e.h) ok(html.includes(h[2].replace(/&/g, "&amp;")), `${tag}: history row "${h[2]}" not printed`);
      ok(html.includes(`href="${e.rs}"`), `${tag}: no link to the record page`);
    }
  }

  // ── 7. mutations ──────────────────────────────────────────────────────────
  section("7. mutations are caught");
  const clone = () => JSON.parse(JSON.stringify(OFFICIAL));
  {
    const m = clone();
    m["2026GS|S.B. 318"].sp.push(["c", "ssandall", SHARE.people.ssandall.n]);
    ok(audit(m).some((x) => /sponsor c:ssandall is not on the record/.test(x)), "an invented co-sponsor is not caught");
  }
  {
    const m = clone();
    m["2026GS|H.B. 585"].sp = [["s", "blouin_s13", SHARE.people.blouin_s13.n]];
    ok(audit(m).some((x) => /not on the record/.test(x)), "a sponsor moved to another person is not caught");
  }
  {
    const m = clone();
    m["2026GS|H.B. 585"].h.push(["2026-03-05", "Passed the House", "House/ passed 3rd reading (70-0-5)"]);
    ok(audit(m).some((x) => /is not an action on the record/.test(x)), "an invented history action is not caught");
  }
  {
    const m = clone();
    delete m["2026GS|S.B. 282"].h;
    ok(audit(m).some((x) => /no history/.test(x)), "a dropped history block is not caught");
  }
  {
    const m = clone();
    m["2026GS|H.B. 76"].o = ["house", "2026-01-21"];
    ok(audit(m).some((x) => /origin is not the record's/.test(x)), "a moved origin date is not caught");
  }
  {
    // The panel printing a sponsor the table does not hold.
    const src = R("bill-detail.js");
    const anchor = "var sp = e.sp || [], su = e.su || {};";
    ok(src.split(anchor).length === 2, "mutation setup: the sponsor anchor is not unique in bill-detail.js");
    const mut = src.replace(anchor, "var sp = (e.sp || []).concat([['c', 'invented_person', 'Invented Person']]), su = e.su || {};");
    const html = await panelFor("2026GS|S.B. 318", false, mut);
    ok(/data-bd-official-sponsor="invented_person"/.test(html), "mutation setup: the invented-sponsor panel mutant did not render");
    ok((html.match(/data-bd-official-sponsor=/g) || []).length !== OFFICIAL["2026GS|S.B. 318"].sp.length,
      "a panel printing an invented sponsor is indistinguishable from the shipped panel");
  }
}

section("5. honest empties");
{
  // A record with no date: the origin prints with no date. A record whose
  // sponsors are not on file: a count, no link.
  const src = R("bill-detail.js");
  ok(/when \? verb \+ ' ' \+ when : ''/.test(src), "the panel's origin line does not drop a missing date");
  ok(/named on the official record; not on file in PolitiDex/.test(src), "the panel does not print the not-on-file count");
  const unlinked = Object.entries(OFFICIAL).filter(([, e]) => !e.sp && e.su);
  for (const [key, e] of unlinked) ok(!(e.sp || []).length, `${key}: sponsors not on file were linked`);
}

section("6. nothing else moved on the page");
{
  const before = billDocs(ROOT, { records: {} });
  for (const [key, d] of Object.entries(DOCS)) {
    const b = before[key];
    ok(!!b, `${key}: page exists only because of the record`);
    if (!b) continue;
    ok(JSON.stringify(b.m || null) === JSON.stringify(d.m || null), `${key}: mappings or effect lines moved`);
    ok((b.t || "") === (d.t || "") && (b.c || "") === (d.c || ""), `${key}: title or chamber moved`);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ bill official panel: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ bill official panel: ${passed} checks passed`);
