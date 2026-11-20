#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-congress-changes.mjs — the committee, co-sponsorship and bill-status
// lanes of the public "what changed" feed
// ─────────────────────────────────────────────────────────────────────────────
// The same snapshot-diff pattern as scripts/gen-roster-changes.mjs, applied to
// the three files the Phase 7 scheduled pulls feed (netlify/functions/
// congress-sync-*.mts → scripts/sync-congress-snapshots.mjs → the derive
// stages in scripts/generators.mjs):
//
//   db/person-committees.json   committee memberships (House Clerk + Senate LIS)
//   db/cosponsorships.json      co-sponsored measures (Congress.gov)
//   db/bill-docs.json           bill status, federal bills only — the status
//                               gen-bill-docs derives from db/bill-record.json
//                               (Congress.gov); Utah rows are not in that pull
//
// It keeps two committed files:
//   db/congress-change-snapshot.json  the three lanes as of the last run
//   db/congress-changes.json          a dated log per lane of what differed
//                                     between runs, newest first:
//     committees      a member joined or left a committee / subcommittee, or
//                     the leadership title the House file prints changed
//     cosponsorships  measures added to or removed from a member's
//                     co-sponsored list, one entry per member per run
//     status          a federal bill's status changed, or a bill page with a
//                     status appeared
//
// Each entry is dated by the pull it came from (the file's fetchedOn), or
// --date, or today. A lane with no earlier snapshot is baselined and logs
// nothing; a co-sponsorship snapshot from a different Congress is re-baselined
// rather than logged as every measure dropping off.
//
//   node scripts/gen-congress-changes.mjs [--date YYYY-MM-DD]   log + re-snapshot
//   node scripts/gen-congress-changes.mjs --check   exit 1 when the three files
//                                    differ from the snapshot
//
// Registered in scripts/generators.mjs after gen-committees.mjs and
// gen-cosponsorships.mjs (and so after gen-bill-docs.mjs). --check reads only
// the repo. netlify/functions/changes-feed.mts serves the newest entries of
// each lane. Read-only to readers.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, sortKeys, writeOrCheck } from "./coverage-core.mjs";

const SNAP = "db/congress-change-snapshot.json";
const LOG = "db/congress-changes.json";
export const MAX_ENTRIES = 1000;
export const MAX_BILLS_PER_ENTRY = 25;
export const LANES = ["committees", "cosponsorships", "status"];

// ── snapshots: each lane's committed file → a small, diffable shape ─────────
// person-committees.json → { names: code → [name, chamber, parent], people: pid → { code: title } }
export function committeeSnap(file) {
  const names = {};
  for (const [code, c] of Object.entries(file?.committees || {})) names[code] = [c[0] || code, c[1] || "", c[2] || ""];
  const people = {};
  for (const [pid, rows] of Object.entries(file?.people || {})) {
    const m = {};
    for (const [code, title] of rows || []) m[code] = title || "";
    people[pid] = m;
  }
  return { names, people };
}

// cosponsorships.json → { congress, bills: [citation …], people: pid → [index into bills] }
export function cosponsorSnap(file) {
  const bills = file?.bills || [];
  const cites = [...new Set(bills.map((b) => b[0]))].sort();
  const at = new Map(cites.map((c, i) => [c, i]));
  const people = {};
  for (const [pid, idx] of Object.entries(file?.people || {})) {
    people[pid] = [...new Set((idx || []).map((i) => bills[i]?.[0]).filter((c) => c != null))].map((c) => at.get(c)).sort((a, b) => a - b);
  }
  return { congress: file?.congress ?? null, bills: cites, people };
}

// bill-docs.json → { key: [status key, status label] } for federal bills with a status
export function statusSnap(file) {
  const out = {};
  for (const [key, d] of Object.entries(file?.docs || {})) {
    if (!/^\d+$/.test(String(d?.s || "")) || !d.st) continue;
    // A ledger-published bill file's status is the ledger's, not a pull of the
    // official record, so it is not a change in the official-record lane.
    if (d.ld) continue;
    out[key] = [d.st, d.sl || ""];
  }
  return out;
}

// ── diffs: snapshot A → snapshot B, as log entries dated `date` ─────────────
// `ctx.names` is pid → display name.
export function diffCommittees(a, b, date, ctx = {}) {
  const out = [];
  const nm = (pid) => ctx.names?.[pid] || pid;
  const info = (code) => {
    const c = b.names?.[code] || a.names?.[code] || [code, "", ""];
    const parent = c[2] ? (b.names?.[c[2]] || a.names?.[c[2]] || [c[2]])[0] : "";
    return { code, committee: c[0], chamber: c[1], ...(c[2] ? { parentCode: c[2], parent } : {}) };
  };
  const A = a.people || {}, B = b.people || {};
  for (const pid of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) {
    const was = A[pid] || {}, now = B[pid] || {};
    for (const code of [...new Set([...Object.keys(was), ...Object.keys(now)])].sort()) {
      const base = { date, pid, name: nm(pid), ...info(code) };
      if (!(code in was)) out.push({ ...base, change: "joined", ...(now[code] ? { title: now[code] } : {}) });
      else if (!(code in now)) out.push({ ...base, change: "left", ...(was[code] ? { title: was[code] } : {}) });
      else if (was[code] !== now[code]) out.push({ ...base, change: "title", before: was[code] || null, after: now[code] || null });
    }
  }
  return out;
}

// `ctx.bills` is citation → [title, Congress.gov page, has a /b/ page] for the current file.
export function diffCosponsorships(a, b, date, ctx = {}) {
  if (a.congress !== b.congress) return [];
  const out = [];
  const nm = (pid) => ctx.names?.[pid] || pid;
  const setOf = (snap, pid) => new Set((snap.people?.[pid] || []).map((i) => snap.bills[i]));
  const row = (cite) => { const m = ctx.bills?.[cite]; return m ? [cite, m[0] || "", m[1] || "", m[2] ? 1 : 0] : [cite, "", "", 0]; };
  for (const pid of [...new Set([...Object.keys(a.people || {}), ...Object.keys(b.people || {})])].sort()) {
    const was = setOf(a, pid), now = setOf(b, pid);
    for (const [change, list] of [["added", [...now].filter((c) => !was.has(c))], ["removed", [...was].filter((c) => !now.has(c))]]) {
      if (!list.length) continue;
      list.sort();
      out.push({ date, pid, name: nm(pid), change, congress: b.congress, count: list.length, bills: list.slice(0, MAX_BILLS_PER_ENTRY).map(row) });
    }
  }
  return out;
}

// `ctx.docs` is the current bill-docs.json docs map (title, record page).
export function diffStatus(a, b, date, ctx = {}) {
  const out = [];
  for (const key of Object.keys(b).sort()) {
    const now = b[key], was = a[key];
    if (was && was[0] === now[0]) continue;
    const d = ctx.docs?.[key] || {};
    const [sitting, ...rest] = key.split("|");
    out.push({
      date, key, sitting, number: d.n || rest.join("|"), title: d.t || "", change: was ? "updated" : "tracked",
      before: was ? { st: was[0], sl: was[1] } : null, after: { st: now[0], sl: now[1] }, src: d.rs || "",
    });
  }
  return out;
}

const render = (log) => JSON.stringify(log, null, 1) + "\n";
const emptyLog = () => ({
  _comment: "GENERATED by scripts/gen-congress-changes.mjs — do not edit by hand. Dated changes between successive pulls of the official record, newest first, one list per lane: committees (a member joined or left a committee or subcommittee, or the leadership title the House Clerk's file prints changed — db/person-committees.json), cosponsorships (measures added to or removed from a member's Congress.gov co-sponsored list — db/cosponsorships.json), status (a federal bill's status changed, or a bill page with a status appeared — db/bill-docs.json from the Congress.gov bill record). The committee, co-sponsorship and bill-status lanes of the public /changes feed.",
  committees: [], cosponsorships: [], status: [],
});

const readJson = (f, root) => { const p = join(root, f); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };

// The committed inputs → { snap, ctx, dates }.
export function currentInputs(root = ROOT) {
  const pc = readJson("db/person-committees.json", root);
  const cs = readJson("db/cosponsorships.json", root);
  const bd = readJson("db/bill-docs.json", root);
  const br = readJson("db/bill-record.json", root);
  const si = readJson("db/share-index.json", root);
  const names = {};
  for (const [pid, v] of Object.entries(si?.people || {})) if (v?.n) names[pid] = v.n;
  for (const [pid, n] of Object.entries(cs?.names || {})) if (!names[pid] && n) names[pid] = n;
  const bills = {};
  for (const b of cs?.bills || []) bills[b[0]] = [b[1], b[4], b[5]];
  return {
    snap: { committees: committeeSnap(pc), cosponsorships: cosponsorSnap(cs), status: statusSnap(bd) },
    ctx: { names, bills, docs: bd?.docs || {} },
    dates: { committees: pc?.sources?.fetchedOn || "", cosponsorships: cs?.fetchedOn || "", status: br?.fetchedOn || "" },
  };
}

// Previous snapshot + current inputs → { committees: [...], cosponsorships: [...], status: [...] }
export function changesBetween(prev, cur, fallbackDate, override = null) {
  const date = (lane) => override || cur.dates[lane] || fallbackDate;
  const out = { committees: [], cosponsorships: [], status: [] };
  if (!prev) return out;
  if (prev.committees) out.committees = diffCommittees(prev.committees, cur.snap.committees, date("committees"), cur.ctx);
  if (prev.cosponsorships) out.cosponsorships = diffCosponsorships(prev.cosponsorships, cur.snap.cosponsorships, date("cosponsorships"), cur.ctx);
  if (prev.status) out.status = diffStatus(prev.status, cur.snap.status, date("status"), cur.ctx);
  return out;
}

export const snapText = (snap) => JSON.stringify(sortKeys(snap)) + "\n";

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const flag = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const cur = currentInputs();
  const text = snapText(cur.snap);

  if (check) {
    const prev = existsSync(join(ROOT, SNAP)) ? readFileSync(join(ROOT, SNAP), "utf8") : null;
    if (prev !== text) { console.error("congress change snapshot is stale (committees, co-sponsorships or bill status changed since the last log entry)"); process.exit(1); }
    if (!existsSync(join(ROOT, LOG))) { console.error(`${LOG} is missing`); process.exit(1); }
    process.exit(0);
  }

  const log = readJson(LOG, ROOT) || emptyLog();
  const prev = readJson(SNAP, ROOT);
  const added = changesBetween(prev, cur, new Date().toISOString().slice(0, 10), flag("--date"));
  for (const lane of LANES) log[lane] = added[lane].concat(log[lane] || []).slice(0, MAX_ENTRIES);
  writeOrCheck(LOG, render(log), { check: false });
  writeOrCheck(SNAP, text, { check: false });
  console.error(LANES.map((l) => `${added[l].length} ${l}`).join(", ") + " change(s) logged");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
