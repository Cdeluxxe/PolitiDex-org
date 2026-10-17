#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-bills-scan.mjs — the sponsored list is easy to scan: a sitting
// label on every row, the heading and tally held in view, nothing else moved
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. GROUPS AND TALLY STILL MATCH THE ROWS. For every person, each group's
//      count is the rows printed under it, and the tally's failed / passed /
//      pending add up to the rows.
//   2. A SITTING LABEL ON EVERY ROW, on the row's first line with the number
//      and the role: "2026 General Session" for Utah, "119th Congress ·
//      2025–26" for a congress (the years read off the congress number).
//   3. THE HEADING STAYS REACHABLE. The heading and the tally are one header,
//      first in the section, position:sticky under the profile's sticky nav
//      (its offset is the nav's measured height), and no stylesheet clips the
//      stage or section it sits in. Checked on the longest list on file.
//   4. THE LETTERHEAD IS UNCHANGED: the jump control's markup in all three
//      states is what it was, and profiles-full.js, finance-lane.js and
//      finance-lane.css are untouched.
//   5. MUTATIONS FAIL: the sitting label dropped, the header no longer sticky,
//      the tally moved out of the header.
//
//   node scripts/test-person-bills-scan.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => { try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch (e) { return null; } };

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);

const TABLE = JSON.parse(R("person-bills.json"));
const SRC = R("person-bills.js");
const load = (src) => {
  const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } };
  sb.window.document = sb.document;
  vm.runInNewContext(src, sb, { filename: "person-bills.js" });
  return sb.window.PDXPersonBills;
};
const PB = load(SRC);

const yearsOf = (c) => { const y = 1789 + 2 * (Number(c) - 1); return `${c}th Congress · ${y}–${String(y + 1).slice(2)}`; };
const labelOf = (s) => (/^\d+$/.test(s) ? yearsOf(s) : /^\d{4}GS$/i.test(s) ? `${s.slice(0, 4)} General Session` : s);

// Everything wrong with one person's rendered list.
function audit(pb, pid) {
  const bad = [];
  const rows = pb.rowsFor(TABLE, pid);
  const h = pb.html(rows);
  // 1. groups and tally
  for (const g of h.matchAll(/data-pdx-sponsored-group="(\w+)"><div class="pdx-spb-gh">[^<]*<span>(\d+)<\/span><\/div><ul>([\s\S]*?)<\/ul><\/div>/g)) {
    const printed = (g[3].match(/data-pdx-sponsored-row/g) || []).length;
    const want = rows.filter((x) => x.g === g[1]).length;
    if (+g[2] !== printed || printed !== want) bad.push(`${pid}: group ${g[1]} says ${g[2]}, prints ${printed}, has ${want}`);
  }
  const t = /data-failed="(\d+)" data-passed="(\d+)" data-pending="(\d+)"/.exec(h);
  if (!t) bad.push(`${pid}: no tally`);
  else if (+t[1] + +t[2] + +t[3] !== rows.length) bad.push(`${pid}: tally adds to ${+t[1] + +t[2] + +t[3]}, rows ${rows.length}`);
  // 2. a sitting label on every row's first line
  const lis = [...h.matchAll(/<li data-pdx-sponsored-row[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  if (lis.length !== rows.length) bad.push(`${pid}: ${lis.length} rows printed of ${rows.length}`);
  const byKey = new Map(rows.map((x) => [`${x.s}|${x.n}`, x]));
  lis.forEach((li) => {
    const line = (/^<div class="pdx-spb-line">([\s\S]*?)<\/div>/.exec(li) || [])[1] || "";
    const x = byKey.get((/data-pdx-sponsored-bill="([^"]+)"/.exec(li) || [])[1]);
    if (!x) { bad.push(`${pid}: a printed row is not one of their bills`); return; }
    const sit = /<span class="pdx-spb-sit" data-pdx-sponsored-sitting="([^"]*)">([^<]*)<\/span>/.exec(line);
    if (!sit) { bad.push(`${pid}: ${x.s}|${x.n} has no sitting label on its first line`); return; }
    if (sit[1] !== x.s || sit[2] !== labelOf(x.s)) bad.push(`${pid}: ${x.s}|${x.n} labelled "${sit[2]}", want "${labelOf(x.s)}"`);
    if (!line.includes(`data-pdx-sponsored-bill="${x.s}|${x.n}"`) || !/class="pdx-spb-role"/.test(line)) bad.push(`${pid}: ${x.s}|${x.n}'s first line lacks the number or the role`);
    if (x.t && !li.includes(`<div class="pdx-spb-t">`)) bad.push(`${pid}: ${x.s}|${x.n} lost its short-title line`);
  });
  // 3. the header: first, holding the heading and the tally
  const head = /^<div class="pdx-spb-head" data-pdx-sponsored-head>([\s\S]*?)<\/div><p class="modal-section-sub">/.exec(h);
  if (!head) bad.push(`${pid}: the section does not open on its header`);
  else if (!/Bills sponsored and co-sponsored/.test(head[1]) || !/pdx-spb-tally/.test(head[1])) bad.push(`${pid}: the header does not hold both the heading and the tally`);
  return bad;
}
const stickyBad = (src) => {
  const bad = [];
  if (!/'#pdx-sponsored \.pdx-spb-head\{position:sticky;top:var\(--pdx-spb-top,0px\);z-index:\d+;[^']*background:rgba\(/.test(src)) bad.push("the header is not sticky with an opaque backing at the nav offset");
  return bad;
};

section("1–3. every person's list: groups, tally, sitting labels, header");
{
  const pids = Object.keys(TABLE.people);
  let bad = [];
  for (const pid of pids) bad = bad.concat(audit(PB, pid));
  ok(bad.length === 0, `the list fails on:\n      ${bad.slice(0, 10).join("\n      ")}`);
  console.log(`      ${pids.length} lists, ${pids.reduce((n, p) => n + TABLE.people[p].length, 0)} rows — ${bad.length ? bad.length + " problems" : "every row labelled"}`);
  const blouin = PB.html(PB.rowsFor(TABLE, "blouin_s13"));
  ok((blouin.match(/>2026 General Session</g) || []).length >= 2, "Nate Blouin's 2026 rows do not read 2026 General Session");
  const fed = PB.html(PB.rowsFor(TABLE, "aaron_bean"));
  ok(/>119th Congress · 2025–26</.test(fed), "a 119th Congress row does not read 2025–26");
  ok(labelOf("117") === "117th Congress · 2021–22" && labelOf("118") === "118th Congress · 2023–24", "the congress-years arithmetic is off");
}

section("3. the heading stays reachable on a long profile");
{
  ok(stickyBad(SRC).length === 0, stickyBad(SRC).join("; "));
  // The offset is the profile nav's height, set on the section when it paints.
  const longest = Object.keys(TABLE.people).sort((a, b) => TABLE.people[b].length - TABLE.people[a].length)[0];
  const props = {};
  const host = {
    attrs: { "data-pdx-sponsored-pid": longest }, hidden: true, innerHTML: "", isConnected: true,
    style: { setProperty: (k, v) => { props[k] = v; } },
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = String(v); },
  };
  const nav = { offsetHeight: 44 };
  const stage = { appendChild: (n) => n };
  const body = { querySelector: (s) => (s === "#pdx-sponsored" ? null : s === ".pdxsp-stage-record" ? stage : null) };
  const doc = {
    readyState: "complete", addEventListener() {}, head: { appendChild() {} },
    getElementById: (id) => (id === "modal-body" ? body : id === "pdx-profile-nav" ? nav : null),
    createElement: (t) => (t === "div" ? host : { set textContent(v) {}, setAttribute() {} }),
    querySelector: () => null,
  };
  const win = { _pdxCurrentProfileId: longest };
  win.document = doc;
  const ctx = vm.createContext({ window: win, document: doc, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(TABLE) }) });
  vm.runInContext(SRC, ctx);
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  ok(!host.hidden && /data-pdx-sponsored-head/.test(host.innerHTML), `${longest}: the longest list did not paint its header`);
  ok(props["--pdx-spb-top"] === "44px", `${longest}: the header's offset is ${props["--pdx-spb-top"]}, not the nav's 44px`);
  console.log(`      ${longest}: ${TABLE.people[longest].length} rows, header held at the nav's height`);
  // Nothing between the section and the scrolling body clips it: a sticky
  // header inside an overflow box sticks to that box instead.
  const css = readdirSync(ROOT).filter((f) => f.endsWith(".css")).map((f) => R(f)).join("\n");
  const clip = /(\.pdxsp-stage(?:-record)?|#pdx-sponsored|\.modal-section)\s*(?:,[^{]*)?\{[^}]*overflow(?:-y|-x)?\s*:\s*(hidden|auto|scroll|clip)/g;
  ok(!clip.test(css), "a stylesheet clips the record stage or the section, so the header would not stay in view");
}

section("4. the letterhead is unchanged");
{
  const prev = HEAD("person-bills.js");
  if (prev != null) {
    const A = load(prev);
    for (const st of ["on", "none", "wait"]) ok(A.jumpHtml("blouin_s13", st) === PB.jumpHtml("blouin_s13", st), `the jump control's ${st} markup changed`);
  }
  for (const f of ["profiles-full.js", "finance-lane.js", "finance-lane.css"]) {
    const h = HEAD(f);
    if (h != null) ok(h === R(f), `${f} changed`);
  }
  const cur = Number(/const CACHE_VERSION = 'v(\d+)';/.exec(R("sw.js"))[1]);
  const was = HEAD("sw.js");
  if (was && prev !== SRC) ok(cur > Number(/const CACHE_VERSION = 'v(\d+)';/.exec(was)[1]), "person-bills.js is precached and changed, but the shell did not move");
}

section("5. mutations fail");
{
  const mut = (from, to) => { ok(SRC.split(from).length === 2, `mutation anchor not unique: ${from.slice(0, 50)}`); return SRC.split(from).join(to); };
  const caught = (name, bad) => { ok(bad.length > 0, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad.length ? "caught" : "MISSED"}`); };
  {
    const M = load(mut("' <span class=\"pdx-spb-sit\" data-pdx-sponsored-sitting=\"' + esc(x.s) + '\">' + esc(sittingLabel(x.s)) + '</span>' +", ""));
    caught("the sitting label dropped", audit(M, "blouin_s13"));
  }
  {
    const M = load(mut("return sittingText(s) + ' \\u00b7 ' + y", "return sittingText(s) + ' \\u00b7 ' + (y + 2)"));
    caught("the congress years off by one congress", audit(M, "aaron_bean"));
  }
  caught("the header no longer sticky", stickyBad(mut("pdx-spb-head{position:sticky;", "pdx-spb-head{position:relative;")));
  {
    const src = mut("      tallyHtml(rows) +\n      '</div>' +", "      '</div>' + tallyHtml(rows) +");
    caught("the tally moved out of the header", audit(load(src), "blouin_s13"));
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ person bills scan: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ person bills scan: ${passed} checks passed`);
