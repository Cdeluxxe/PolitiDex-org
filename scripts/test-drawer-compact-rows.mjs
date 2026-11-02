#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-compact-rows.mjs — the issue drawer leads with the votes
// ─────────────────────────────────────────────────────────────────────────────
// On Mike Lee's Protect Public Lands drawer the gray "On record · not in
// Direction Match…" box sat between the finding line and the tally, and every
// vote row printed its effect sentence and its ALSO ON chips open, so the last
// row fell off the first screen. Now:
//
//   1. FIRST SCREEN: the finding line, the tally and the vote rows. The no-side
//      note is not above the tally and not anywhere in the ledger; on a sheet
//      with a vote table it is the first thing inside How this is scored.
//   2. COLLAPSED ROWS: the stylesheet folds every row's effect line, pointer line
//      and ALSO ON chips until their own row carries data-pdxlg-open, so a closed
//      row is date · measure · kind · vote · pill. No row is rendered open, so a
//      reopened drawer starts collapsed too. The row markup itself is unchanged.
//   3. ONE ROW OPENS: the row's Details control, or a tap on the row itself,
//      opens that row's effect line, chips and details, and no other row's.
//   4. SAME NOTE, SAME RECORD: the note is word for word HEAD's, and apart from
//      where the note sits, the drawer is HEAD's drawer —
//      same effect lines, same Congress.gov links, same issue rows and scores.
//   5. MUTATIONS: the note put back above the tally, an effect row left open, and
//      a toggle that opens every row must each fail.
//
//   node scripts/test-drawer-compact-rows.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch { return null; }
};
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const corpus = buildCorpus(ROOT);
const PID = "lee", KEY = "lands_preserve";
const SAMPLE_PIDS = ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis"];
const NOTE_RE = /<div class="pdxdos-led pdxdos-led-top" data-pdxdos-led="1">[\s\S]*?<\/div>/;

function boot(src) {
  const win = makeSandbox();
  const clicks = [];
  win.document.addEventListener = (t, fn) => { if (t === "click") clicks.push(fn); };
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  win.__clicks = clicks;
  return win;
}
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// ── A DOM JUST BIG ENOUGH FOR ONE LEDGER TABLE ─────────────────────────────
// Every <tr> of the table becomes a node with its attributes and its folding; the
// Details button, a plain cell and the details cell hang off their rows. Enough
// for _lgToggle and the delegated click handler to do what they do on a phone.
function attrsOf(s) {
  const a = {};
  for (const m of String(s).matchAll(/([\w-]+)(?:="([^"]*)")?/g)) a[m[1]] = m[2] == null ? "" : m[2];
  return a;
}
function matches(n, sel) {
  return sel.split(",").some((part) => {
    const m = /^\s*([a-z]*)(?:\[([\w-]+)(?:="([^"]*)")?\])?\s*$/i.exec(part);
    if (!m) return false;
    if (m[1] && n.tag !== m[1].toLowerCase()) return false;
    if (m[2] && !(m[2] in n.attrs)) return false;
    if (m[3] != null && n.attrs[m[2]] !== m[3]) return false;
    return !!(m[1] || m[2]);
  });
}
function mk(tag, attrs, parent) {
  const n = {
    tag, attrs: attrs || {}, parent, kids: [], innerHTML: "",
    getAttribute: (k) => (k in n.attrs ? n.attrs[k] : null),
    setAttribute: (k, v) => { n.attrs[k] = String(v); },
    removeAttribute: (k) => { delete n.attrs[k]; },
    closest(sel) { let x = n; while (x) { if (matches(x, sel)) return x; x = x.parent; } return null; },
    querySelector(sel) {
      const walk = (x) => { for (const k of x.kids) { if (matches(k, sel)) return k; const r = walk(k); if (r) return r; } return null; };
      return walk(n);
    },
  };
  Object.defineProperty(n, "hidden", {
    get: () => (n.folded ? n.folded() : "hidden" in n.attrs),
    set: (v) => { if (v) n.attrs.hidden = ""; else delete n.attrs.hidden; },
  });
  if (parent) parent.kids.push(n);
  return n;
}
// Which sub-rows the shipped stylesheet folds, read off the source under test.
function foldedKinds(src) {
  const m = /'\.pdxlg-t (tr\.pdxlg-[a-z]+(?:,\.pdxlg-t tr\.pdxlg-[a-z]+)*)\{display:none;\}'/.exec(src);
  return new Set(m ? [...m[1].matchAll(/tr\.pdxlg-([a-z]+)/g)].map((x) => x[1]) : []);
}
function domOf(html, folded) {
  folded = folded || new Set();
  const lg = /<div class="pdxlg"([^>]*)>/.exec(html);
  if (!lg) return null;
  const root = mk("div", attrsOf(lg[1]), null);
  const rows = [], byI = {};
  for (const tm of html.slice(lg.index).matchAll(/<table class="pdxlg-t">([\s\S]*?)<\/table>/g)) {
    const tbl = mk("table", { class: "pdxlg-t" }, root);
    for (const m of tm[1].matchAll(/<tr( [^>]*)?>([\s\S]*?)<\/tr>/g)) {
      const tr = mk("tr", attrsOf(m[1] || ""), tbl);
      tr.html = m[2];
      if ("data-pdxlg-row" in tr.attrs) {
        tr.cell = mk("td", { class: "pdxlg-k" }, tr);
        const b = /<button type="button" class="pdxlg-tog"([^>]*)>/.exec(m[2]);
        if (b) tr.btn = mk("button", attrsOf(b[1]), tr);
        rows.push(tr);
        byI[tr.attrs["data-pdxlg-row"]] = tr;
      }
      for (const k of ["effr", "ptrr", "relr"]) {
        const i = tr.attrs[`data-pdxlg-${k}`];
        if (i == null) continue;
        tr.folded = () => folded.has(k) && !(byI[i] && "data-pdxlg-open" in byI[i].attrs);
      }
      if ("data-pdxlg-morer" in tr.attrs) mk("td", { "data-pdxlg-more": "1" }, tr);
    }
  }
  return { root, rows };
}
// The sub-rows that belong to row i, in every table of the ledger.
function subRows(dom, i) {
  const out = [];
  const walk = (x) => {
    for (const k of x.kids) {
      if (k.tag === "tr" && ["data-pdxlg-effr", "data-pdxlg-ptrr", "data-pdxlg-relr", "data-pdxlg-morer"].some((a) => k.attrs[a] === String(i))) out.push(k);
      walk(k);
    }
  };
  walk(dom.root);
  return out;
}

function check(src, opts = {}) {
  const faults = [];
  let pass = 0, sheets = 0, rowsSeen = 0;
  const ok = (c, m) => { if (c) pass++; else if (faults.length < 200) faults.push(m); };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass };
  const CS = win.PDXConsistency;
  const folded = foldedKinds(src);
  ok(/tr\[data-pdxlg-open\]\+tr\.pdxlg-effr/.test(src), "the stylesheet has no rule that shows an opened row's effect line");
  if (!CS || typeof CS.gapViewHtml !== "function" || typeof CS.ledgerToggle !== "function") {
    return { faults: ["the drawer API (gapViewHtml, ledgerToggle) is not published"], pass };
  }

  // ── 1 · Lee × Protect Public Lands, first screen ─────────────────────────
  const h = CS.gapViewHtml(PID, KEY) || "";
  const where = `${PID} × ${KEY}`;
  const tally = h.indexOf('data-pdxlg-tally="1"');
  const find = h.indexOf('class="pdxlg-find"');
  const how = h.indexOf('<details class="pdxgap-how"');
  const note = h.indexOf('data-pdxdos-led="1"');
  ok(find >= 0, `${where}: the drawer has no finding line`);
  ok(tally >= 0, `${where}: the drawer has no bills/acts tally`);
  ok(find < tally, `${where}: the finding line is not above the tally`);
  ok(note >= 0, `${where}: the no-side note is gone — it is meant to move, not disappear`);
  ok(note < 0 || note > tally, `${where}: the gray no-side note sits above the tally`);
  ok(how >= 0 && note > how, `${where}: the no-side note is not inside How this is scored`);
  const firstScreen = h.slice(0, how < 0 ? h.length : how)
    .replace(/<tr class="pdxlg-(?:effr|ptrr|relr|morer)"[\s\S]*?<\/tr>/g, "");
  ok(!/not in Direction Match/i.test(text(firstScreen)), `${where}: "not in Direction Match" is printed on the first screen`);
  ok(!/data-pdxdos-led/.test(firstScreen), `${where}: the no-side note is on the first screen`);

  // ── 4 · the note says what it said ──────────────────────────────────────
  if (opts.headNote) {
    const mine = (NOTE_RE.exec(h) || [""])[0];
    ok(mine === opts.headNote, `${where}: the no-side note does not say what it said before it moved`);
  }

  // ── 2, 3 · every sheet in the sample: collapsed, and one row opens ──────
  const sheetsToCheck = [[PID, KEY]];
  for (const pid of opts.pids || []) {
    let keys = [];
    try { keys = (CS.issueRows(pid) || []).map((r) => r.key); } catch { keys = []; }
    for (const k of keys) if (!(pid === PID && k === KEY)) sheetsToCheck.push([pid, k]);
  }
  for (const [pid, key] of sheetsToCheck) {
    const sh = pid === PID && key === KEY ? h : (CS.gapViewHtml(pid, key) || "");
    const w = `${pid} × ${key}`;
    const dom = domOf(sh, folded);
    if (!dom || !dom.rows.length) continue;
    sheets++;
    let items = [];
    try { items = CS.dossierItems(pid, key) || []; } catch { items = []; }
    for (const tr of dom.rows) {
      rowsSeen++;
      const i = tr.attrs["data-pdxlg-row"];
      ok(!("data-pdxlg-open" in tr.attrs), `${w}: row ${i} is rendered open`);
      ok(!/data-pdxlg-rel|pdxlg-eff|pdxlg-ptr/.test(tr.html), `${w}: row ${i} carries its effect line or chips on the row itself`);
      for (const s of subRows(dom, i)) ok(s.hidden, `${w}: row ${i}'s ${Object.keys(s.attrs).find((a) => a.startsWith("data-pdxlg-"))} is open before anyone tapped it`);
      const d = items[Number(i)] || {};
      if (d.effLine) {
        const eff = subRows(dom, i).find((s) => "data-pdxlg-effr" in s.attrs);
        ok(eff && text(eff.html) === text(d.effLine), `${w}: row ${i}'s effect sentence is not the one on file`);
      }
    }
    // Open one row — by the Details control on the first, by a tap on the row
    // itself on the second where the click handler is bound — and nothing else.
    const open = (tr, how) => {
      if (how === "tap" && win.__clicks.length) {
        for (const fn of win.__clicks) { try { fn({ target: tr.cell, preventDefault() {}, stopPropagation() {} }); } catch { /* other branches */ } }
      } else CS.ledgerToggle(tr.btn);
    };
    const probes = [[dom.rows[0], "button"]];
    if (dom.rows.length > 1) probes.push([dom.rows[1], win.__clicks.length ? "tap" : "button"]);
    for (const [tr, how2] of probes) {
      const i = tr.attrs["data-pdxlg-row"];
      open(tr, how2);
      ok(tr.btn && tr.btn.getAttribute("aria-expanded") === "true", `${w}: ${how2 === "tap" ? "tapping" : "the Details control on"} row ${i} did not open it`);
      for (const s of subRows(dom, i)) ok(!s.hidden, `${w}: opening row ${i} left its ${Object.keys(s.attrs).find((a) => a.startsWith("data-pdxlg-"))} closed`);
      for (const other of dom.rows) {
        const j = other.attrs["data-pdxlg-row"];
        if (j === i) continue;
        for (const s of subRows(dom, j)) ok(s.hidden, `${w}: opening row ${i} also opened row ${j}`);
      }
      open(tr, how2);
      for (const s of subRows(dom, i)) ok(s.hidden, `${w}: row ${i} did not close again`);
    }
    // Reopening the drawer renders it again, and it comes back collapsed.
    const again = domOf(CS.gapViewHtml(pid, key) || "", folded);
    for (const tr of (again && again.rows) || []) for (const s of subRows(again, tr.attrs["data-pdxlg-row"])) {
      ok(s.hidden, `${w}: the reopened drawer has row ${tr.attrs["data-pdxlg-row"]} open`);
    }
  }
  if (sheets < 2) faults.push(`only ${sheets} ledger sheets checked — the corpus did not reach the engine`);
  return { faults, pass, sheets, rowsSeen, win };
}

// ── 4 · nothing else moved: same rows, same links, same scores as HEAD ─────
const SRC = R("consistency.js");
const HEAD_SRC = HEAD("consistency.js");
let headNote = null;
const parity = [];
let parityPass = 0;
if (HEAD_SRC && HEAD_SRC !== SRC) {
  const hw = boot(HEAD_SRC), nw = boot(SRC);
  headNote = (NOTE_RE.exec(hw.PDXConsistency.gapViewHtml(PID, KEY) || "") || [""])[0];
  // The two things this pass changes, undone, so the rest can be compared byte for byte.
  const norm = (s) => String(s || "")
    .replace(NOTE_RE, "")
    .replace(/: what it did, full title, the bill/g, ": full title, the bill");
  for (const pid of SAMPLE_PIDS) {
    const a = JSON.stringify(hw.PDXConsistency.issueRows(pid)), b = JSON.stringify(nw.PDXConsistency.issueRows(pid));
    if (a === b) parityPass++; else parity.push(`${pid}: issue rows (scores, Direction Match) differ from HEAD`);
    for (const r of nw.PDXConsistency.issueRows(pid) || []) {
      const hh = hw.PDXConsistency.gapViewHtml(pid, r.key) || "", nh = nw.PDXConsistency.gapViewHtml(pid, r.key) || "";
      if (norm(hh) === norm(nh)) parityPass++;
      else parity.push(`${pid} × ${r.key}: the drawer differs from HEAD beyond the note's place and the collapsed rows`);
      const links = (s) => (s.match(/https?:\/\/(?:www\.)?congress\.gov[^"' <]*/g) || []).join("\n");
      if (links(hh) === links(nh)) parityPass++; else parity.push(`${pid} × ${r.key}: the Congress.gov links changed`);
    }
  }
  if (!headNote) parity.push(`HEAD's ${PID} × ${KEY} drawer printed no no-side note — this suite has no subject`);
}

const live = check(SRC, { headNote, pids: SAMPLE_PIDS });

const MUTANTS = [
  { name: "the gray note back above the tally",
    edit: (s) => s.replace("(_lgOn ? '' : _dosLedTopHtml(pid, issueKey, off)) +", "_dosLedTopHtml(pid, issueKey, off) +"),
    expect: /sits above the tally|on the first screen/ },
  { name: "the effect row left open",
    edit: (s) => s.replace("'.pdxlg-t tr.pdxlg-effr,.pdxlg-t tr.pdxlg-ptrr,.pdxlg-t tr.pdxlg-relr{display:none;}'",
      "'.pdxlg-t tr.pdxlg-ptrr,.pdxlg-t tr.pdxlg-relr{display:none;}'"),
    expect: /effr is open before anyone tapped it/ },
  { name: "a toggle that opens other rows too",
    edit: (s) => s.replace(`if (open) own.setAttribute('data-pdxlg-open', '1');`,
      `if (open) { own.setAttribute('data-pdxlg-open', '1'); var o2 = tbl.querySelector('[data-pdxlg-row]'); if (o2) o2.setAttribute('data-pdxlg-open', '1'); }`),
    expect: /also opened row/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(SRC);
  if (src === SRC) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, { headNote, pids: SAMPLE_PIDS });
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(parity, mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ drawer compact rows: ${all.length} failure(s), ${live.pass + parityPass} passed`);
  process.exit(1);
}
console.log(`\n   ${live.sheets} ledger sheets · ${live.rowsSeen} rows · ${parityPass} HEAD-parity checks` +
  (HEAD_SRC === SRC ? " (consistency.js matches HEAD; parity skipped)" : ""));
console.log(`✓ drawer compact rows: all ${live.pass + parityPass} assertions passed, ${MUTANTS.length} mutations caught`);
