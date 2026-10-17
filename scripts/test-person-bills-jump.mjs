#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-bills-jump.mjs — the "Bills sponsored" jump on the person-file
// letterhead lands on the sponsored-bills section, and invents nothing
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. ON A SPONSOR. A person person-bills.json lists (a Utah data-center
//      sponsor, a federal member) gets one "Bills sponsored" control in the
//      letterhead row, enabled, and a tap jumps to #pdx-sponsored — the section
//      that holds exactly their rows.
//   2. ON A PERSON WITH NONE. The control is there, disabled, says "none on
//      file", and no list is made: the section stays hidden and empty, and a
//      tap goes nowhere. A table that failed to load says nothing either way.
//   3. THE LETTERHEAD IS UNCHANGED. The money pills are the same nodes in the
//      same order, the control sits after them and before the party, it is not
//      a money pill and carries no 💰. profiles-full.js, finance-lane.js and
//      finance-lane.css are untouched, and the sponsored list renders byte for
//      byte what it rendered before.
//   4. MUTATIONS FAIL: the jump removed, the jump aimed at another section,
//      the click wired to nothing, a list printed for a person with none.
//
//   node scripts/test-person-bills-jump.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
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
const SHARE = JSON.parse(R("db/share-index.json"));
const SRC = R("person-bills.js");

// ── a DOM just big enough for the letterhead row and the record stage ───────
class El {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.attrs = {}; this.children = []; this.parentNode = null; this._html = null; this.doc = doc; this.hidden = false; this.focused = false; }
  get id() { return this.attrs.id || ""; } set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ""; } set className(v) { this.attrs.class = v; }
  get disabled() { return "disabled" in this.attrs; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === this.doc.body; }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text || ""; } set textContent(v) { this._text = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } hasAttribute(k) { return k in this.attrs; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  insertBefore(c, ref) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  replaceChild(n, o) { const i = this.children.indexOf(o); if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.children[i] = n; o.parentNode = null; return o; }
  set innerHTML(h) {
    this._html = String(h); this.children = [];
    // The only markup this module parses back into nodes is its own button.
    const m = /^<button([^>]*)>([\s\S]*)<\/button>$/.exec(this._html);
    if (m) {
      const b = new El("button", this.doc);
      for (const a of m[1].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) b.attrs[a[1]] = a[2] == null ? "" : a[2];
      b._text = m[2].replace(/<[^>]+>/g, "");
      b._html = m[2];
      this.appendChild(b);
    }
  }
  get innerHTML() { return this._html == null ? "" : this._html; }
  matches(sel) {
    if (sel[0] === "#") return this.id === sel.slice(1);
    if (sel[0] === ".") return this.className.split(/\s+/).includes(sel.slice(1));
    const a = /^\[([a-z-]+)\]$/.exec(sel); if (a) return this.hasAttribute(a[1]);
    return false;
  }
  all(out = []) { for (const c of this.children) { out.push(c); c.all(out); } return out; }
  querySelector(sel) { return this.all().find((n) => n.matches(sel)) || null; }
  querySelectorAll(sel) { return this.all().filter((n) => n.matches(sel)); }
  closest(sel) { let n = this; while (n) { if (n.matches && n.matches(sel)) return n; n = n.parentNode; } return null; }
  focus() { this.focused = true; } scrollIntoView() { this.scrolled = true; }
}

const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

async function bootFile(pid, { src = SRC, table = TABLE } = {}) {
  const doc = { readyState: "complete", handlers: [] };
  doc.body = new El("body", doc);
  doc.head = new El("head", doc);
  doc.documentElement = doc.head;
  doc.createElement = (t) => new El(t, doc);
  doc.getElementById = (id) => doc.body.all().find((n) => n.id === id) || null;
  doc.querySelector = (s) => doc.body.querySelector(s);
  doc.addEventListener = (type, fn) => { if (type === "click") doc.handlers.push(fn); };
  const mk = (tag, cls, parent) => { const e = new El(tag, doc); if (cls) e.className = cls; parent.appendChild(e); return e; };
  const modal = mk("div", "", doc.body); modal.id = "modal-body";
  const meta = mk("div", "profile-meta", mk("div", "profile-hero", modal));
  const status = mk("span", "pdx-status", meta);
  const mhost1 = mk("span", "pdx-mchip-host", meta); const m1 = mk("button", "pdx-mchip", mhost1); m1.setAttribute("data-pdx-mchip-lane", "receipts");
  const mhost2 = mk("span", "pdx-mchip-host", meta); const m2 = mk("button", "pdx-mchip", mhost2); m2.setAttribute("data-pdx-mchip-lane", "wealth");
  const party = mk("span", "profile-party", meta);
  mk("div", "pdxsp-stage-record", modal);
  const before = meta.children.slice();
  const jumps = [];
  const win = {
    _pdxCurrentProfileId: pid,
    _pdxNavJump: (t) => jumps.push(t),
  };
  const ctx = vm.createContext({
    window: win, document: doc, setTimeout, Promise, JSON, String, Object, Array,
    fetch: (u) => /person-bills\.json$/.test(String(u)) && table
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(table) })
      : Promise.resolve({ ok: false }),
  });
  win.document = doc;
  vm.runInContext(src, ctx, { filename: "person-bills.js" });
  await settle();
  win.PDXPersonBills.scan();
  await settle();
  const btn = meta.querySelector("[data-pdx-sponsored-jump]");
  const click = () => { for (const h of doc.handlers) h({ target: btn, preventDefault() {}, stopPropagation() {} }); };
  return { win, doc, meta, btn, before, money: [m1, m2], status, party, jumps, click };
}

// ── people ──────────────────────────────────────────────────────────────────
const UTAH = "blouin_s13"; // S.B. 282, S.B. 318 — the data-center sponsor
const FED = Object.keys(TABLE.people).find((p) => TABLE.people[p].some(([i]) => /^\d+$/.test(TABLE.bills[i][0])) && SHARE.people[p]);
const NONE = Object.keys(SHARE.people).find((p) => /^[a-z0-9_]{1,80}$/.test(p) && !TABLE.people[p]);
if (!FED || !NONE || !TABLE.people[UTAH]) { console.error("✗ person bills jump: STALE HARNESS — fixtures not found"); process.exit(2); }

// The checks for one file, shared with the mutations. Returns the problems.
async function auditSponsor(pid, opts) {
  const bad = [];
  const f = await bootFile(pid, opts);
  if (!f.btn) return [`${pid}: no "Bills sponsored" control on the letterhead`];
  if (!/^Bills sponsored$/.test(f.btn.textContent.trim())) bad.push(`${pid}: the control reads "${f.btn.textContent}"`);
  if (f.btn.disabled) bad.push(`${pid}: the control is disabled on a person with bills`);
  f.click();
  if (f.jumps.length !== 1 || f.jumps[0] !== "pdx-sponsored") bad.push(`${pid}: the jump went to ${JSON.stringify(f.jumps)}, not the sponsored section`);
  const target = f.doc.getElementById(f.jumps[0] || "");
  if (!target) bad.push(`${pid}: the jump has no section to land on`);
  else {
    if (target.getAttribute("data-pdx-sponsored-pid") !== pid || target.hidden) bad.push(`${pid}: the jump lands on something that is not this person's sponsored section`);
    const rows = (target.innerHTML.match(/data-pdx-sponsored-row/g) || []).length;
    if (rows !== TABLE.people[pid].length) bad.push(`${pid}: the section it lands on lists ${rows} bills, the table ${TABLE.people[pid].length}`);
    if (!target.focused) bad.push(`${pid}: the section is not focused on arrival`);
  }
  return bad;
}
async function auditNone(pid, opts) {
  const bad = [];
  const f = await bootFile(pid, opts);
  if (!f.btn) return [`${pid}: no control on a person with no bills`];
  if (!f.btn.disabled || f.btn.getAttribute("data-state") !== "none") bad.push(`${pid}: the control is not disabled with state "none"`);
  if (!/none on file/.test(f.btn.textContent)) bad.push(`${pid}: the control does not say "none on file"`);
  f.click();
  if (f.jumps.length) bad.push(`${pid}: a disabled control still jumped`);
  const host = f.doc.getElementById("pdx-sponsored");
  if (host && (!host.hidden || host.innerHTML || /data-pdx-sponsored-row/.test(host.innerHTML))) bad.push(`${pid}: a list was made for a person with none`);
  return bad;
}

section("1. a sponsor — Utah and federal — jumps to the sponsored section");
for (const pid of [UTAH, FED]) {
  const bad = await auditSponsor(pid);
  ok(!bad.length, bad.join("; "));
  console.log(`      ${pid}: ${bad.length ? "FAILED" : "jump lands on " + TABLE.people[pid].length + " rows"}`);
}

section("2. a person with none — present, disabled, no list");
{
  const bad = await auditNone(NONE);
  ok(!bad.length, bad.join("; "));
  console.log(`      ${NONE}: ${bad.length ? "FAILED" : "disabled, none on file"}`);
  // A table that did not load: still present, disabled, no claim about the person.
  const f = await bootFile(UTAH, { table: null });
  ok(f.btn && f.btn.disabled && f.btn.getAttribute("data-state") === "wait" && !/none on file/.test(f.btn.textContent),
    "with the table unavailable the control claims something about the person");
}

section("3. the letterhead is unchanged around it");
{
  const f = await bootFile(UTAH);
  const kids = f.meta.children;
  const others = kids.filter((n) => n !== f.btn);
  ok(others.length === f.before.length && others.every((n, i) => n === f.before[i]), "the letterhead's own nodes moved or changed");
  ok(kids.indexOf(f.btn) === kids.indexOf(f.party) - 1 && kids.indexOf(f.btn) > kids.indexOf(f.money[1].parentNode), "the control is not after the money pills and before the party");
  ok(f.money.every((m) => m.className === "pdx-mchip" && m.children.length === 0), "a money pill was changed");
  ok(!/pdx-mchip/.test(f.btn.className) && !/\u{1F4B0}|\\u\{1F4B0\}/u.test(f.btn.textContent + f.btn.innerHTML), "the control is styled or glyphed as a money pill");
  ok(f.meta.querySelectorAll("[data-pdx-sponsored-jump]").length === 1, "more than one jump on the letterhead");
  f.win.PDXPersonBills.scan(); await settle();
  ok(f.meta.querySelectorAll("[data-pdx-sponsored-jump]").length === 1, "a re-scan added a second jump");
  for (const file of ["profiles-full.js", "finance-lane.js", "finance-lane.css"]) {
    const h = HEAD(file);
    if (h != null) ok(h === R(file), `${file} changed`);
  }
  // The list itself renders exactly what it rendered before.
  const prev = HEAD("person-bills.js");
  if (prev != null) {
    const run = (src) => {
      const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } };
      sb.window.document = sb.document;
      vm.runInNewContext(src, sb);
      return sb.window.PDXPersonBills;
    };
    const A = run(prev), B = run(SRC);
    for (const pid of [UTAH, FED, ...Object.keys(TABLE.people).slice(0, 40)]) {
      // The tally line is the one addition; everything else is the list as it was.
      const strip = (h) => h.replace(/<p class="pdx-spb-tally"[^>]*>[^<]*<\/p>/, "");
      ok(strip(A.html(A.rowsFor(TABLE, pid))) === strip(B.html(B.rowsFor(TABLE, pid))), `${pid}: the sponsored list renders differently`);
    }
  }
  ok(/^const CACHE_VERSION = 'v(\d+)';$/m.test(R("sw.js")), "CACHE_VERSION is not readable");
  const cur = Number(/const CACHE_VERSION = 'v(\d+)';/.exec(R("sw.js"))[1]);
  const was = HEAD("sw.js"); const wasV = was ? Number((/const CACHE_VERSION = 'v(\d+)';/.exec(was) || [0, 0])[1]) : 0;
  if (was && HEAD("person-bills.js") !== SRC) ok(cur > wasV, "person-bills.js is precached and changed, but the shell did not move");
}

section("4. mutations fail");
{
  const mutate = (from, to, label) => {
    const n = SRC.split(from).length - 1;
    if (n !== 1) { failures.push(`mutation setup: ${label} — anchor matches ${n} places`); return null; }
    return SRC.split(from).join(to);
  };
  const cases = [
    ["jump removed", mutate("    if (host) fill(host);\n    placeJump(pid);", "    if (host) fill(host);", "jump removed (scan)")
      ?.replace("if (data) { _settled = { pid: pid, n: rows.length }; placeJump(pid); }", "if (data) { _settled = { pid: pid, n: rows.length }; }")
      ?.replace("        placeJump(pid);\n      });", "      });"), "sponsor"],
    ["jump aimed at the record stage", mutate("var TARGET = 'pdx-sponsored';", "var TARGET = 'pdxsp-record';", "wrong target"), "sponsor"],
    ["click wired to nothing", mutate("    e.stopPropagation();\n    jump();", "    e.stopPropagation();", "no click"), "sponsor"],
    ["list made for a person with none", mutate("if (!rows.length) { host.hidden = true; host.innerHTML = ''; return; }",
      "if (!rows.length) { host.hidden = false; host.innerHTML = '<li data-pdx-sponsored-row></li>'; return; }", "invented list"), "none"],
    ["empty person shown as enabled", mutate("return _settled.n ? 'on' : 'none';", "return 'on';", "enabled when none"), "none"],
  ];
  for (const [name, src, who] of cases) {
    if (!src) continue;
    const bad = who === "sponsor" ? await auditSponsor(UTAH, { src }) : await auditNone(NONE, { src });
    ok(bad.length > 0, `mutation not caught: ${name}`);
    console.log(`      mutation: ${name} → ${bad.length ? "caught" : "MISSED"}`);
  }
}

section("5. the quill on the control, the tally in the section");
{
  const QUILL = /<svg class="pdx-spj-ico" data-pdx-spj-quill[^>]*>[\s\S]*?<\/svg>/;
  const on = await bootFile(UTAH), none = await bootFile(NONE);
  for (const [label, f] of [["enabled", on], ["none on file", none]]) {
    const inner = f.btn ? f.btn.innerHTML : "";
    ok(QUILL.test(inner), `the ${label} control has no quill`);
    ok(inner.indexOf("<svg") < inner.indexOf("Bills sponsored"), `the ${label} control's quill is not left of the label`);
    ok(/stroke="currentColor"/.test(inner) && !/fill="(?!none)[^"]+"|stroke="#/.test((QUILL.exec(inner) || [""])[0]), `the ${label} quill is not drawn in the control's own ink`);
    ok(!/\u{1F4B0}|\u{1FAB6}|\u2712|\u{1F58B}/u.test(inner), `the ${label} control carries a colour emoji`);
  }
  ok(/\.pdx-spj-ico\{[^}]*width:0\.7rem;height:0\.7rem;color:currentColor;/.test(SRC), "the quill is not the money glyph's size in currentColor");
  ok(!/\.pdx-spj[^{]*\{[^}]*(money|#f[0-9a-f]{2}c|gold)/i.test(SRC), "the control picked up a money colour");

  // Counts off the rows the list prints. 6 failed · 0 passed is Nate Blouin.
  const B = (() => { const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } }; sb.window.document = sb.document; vm.runInNewContext(SRC, sb); return sb.window.PDXPersonBills; })();
  const tally = (pid) => { const m = /<p class="pdx-spb-tally"[^>]*>([^<]*)<\/p>/.exec(B.html(B.rowsFor(TABLE, pid))); return m ? m[1] : null; };
  const expect = (pid) => {
    const g = TABLE.people[pid].map(([i]) => TABLE.bills[i][4]);
    const f = g.filter((x) => x === "failed").length, p = g.filter((x) => x === "enacted" || x === "passed").length, q = g.filter((x) => x === "pending").length;
    return `${f} failed · ${p} passed` + (q ? ` · ${q} pending` : "");
  };
  ok(tally(UTAH) === "6 failed · 0 passed", `${UTAH}'s tally reads ${JSON.stringify(tally(UTAH))}, not "6 failed · 0 passed"`);
  const mixed = Object.keys(TABLE.people).filter((p) => new Set(TABLE.people[p].map(([i]) => TABLE.bills[i][4])).size >= 3);
  ok(mixed.length > 0, "no mixed-outcome person to test");
  let checked = 0;
  for (const pid of Object.keys(TABLE.people)) { ok(tally(pid) === expect(pid), `${pid}: tally ${JSON.stringify(tally(pid))}, rows say ${JSON.stringify(expect(pid))}`); checked++; }
  console.log(`      ${mixed[0]}: ${tally(mixed[0])} · ${checked} tallies matched their own rows`);
  ok(B.html([]).indexOf("pdx-spb-tally") < 0, "a person with no bills gets a tally");
  const host = none.doc.getElementById("pdx-sponsored");
  ok(!host || !/pdx-spb-tally/.test(host.innerHTML), `${NONE}: a tally is on the page of a person with none`);
  const onHost = on.doc.getElementById("pdx-sponsored");
  ok(onHost && /6 failed · 0 passed/.test(onHost.innerHTML), `${UTAH}: the mounted section does not carry the tally`);

  // Mutations on the tally and the quill.
  const mut = (from, to) => { ok(SRC.split(from).length === 2, `mutation anchor not unique: ${from.slice(0, 40)}`); return SRC.split(from).join(to); };
  const run = (src) => { const sb = { window: {}, document: { readyState: "loading", addEventListener() {}, getElementById: () => null, querySelector: () => null } }; sb.window.document = sb.document; vm.runInNewContext(src, sb); return sb.window.PDXPersonBills; };
  const tallyOf = (P, pid) => { const m = /<p class="pdx-spb-tally"[^>]*>([^<]*)<\/p>/.exec(P.html(P.rowsFor(TABLE, pid))); return m ? m[1] : null; };
  const M1 = run(mut("else if (g === 'enacted' || g === 'passed') n.passed++;", "else if (g === 'passed') n.passed++;"));
  ok(Object.keys(TABLE.people).some((p) => tallyOf(M1, p) !== expect(p)), "mutation not caught: enacted bills dropped from passed");
  const M2 = run(mut("if (!rows || !rows.length) return '';", "if (!rows) return '';"));
  ok(/pdx-spb-tally/.test(M2.html([])), "mutation setup: empty tally mutant did not render");
  const M3 = run(mut("QUILL + 'Bills sponsored'", "'Bills sponsored'"));
  ok(!QUILL.test(M3.jumpHtml(UTAH, "none")), "mutation not caught: the quill dropped from the control");
}

console.log("");
if (failures.length) {
  console.error(`✗ person bills jump: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ person bills jump: ${passed} checks passed`);
